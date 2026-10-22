"""Build reproducible real-image crops from official Fashionpedia annotations.

Uses HTTP ranges to read selected ZIP members rather than downloading 3.3 GB.
Keeps official validation images completely separate for the final test set.
"""
import argparse
from collections import defaultdict, Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import io
import json
from pathlib import Path
import random
import struct
import threading
import zipfile
import zlib

import ijson
import requests
from PIL import Image

BASE = "https://s3.amazonaws.com/ifashionist-dataset/"
# Fashionpedia categories are coarser than Divara's full taxonomy. Do not claim
# this classifier distinguishes blouse from shirt, or heels from other shoes.
MAPPING = {"shirt, blouse": "shirt", "top, t-shirt, sweatshirt": "tee", "sweater": "sweater", "cardigan": "cardigan", "jacket": "jacket", "pants": "trousers", "shorts": "shorts", "skirt": "skirt", "coat": "coat", "dress": "dress", "hat": "hat", "shoe": "shoes", "bag, wallet": "bag", "scarf": "scarf", "belt": "belt", "watch": "watch"}
LOCAL = threading.local()


def session():
    if not hasattr(LOCAL, "session"):
        LOCAL.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(max_retries=3)
        LOCAL.session.mount("https://", adapter)
    return LOCAL.session


def get_range(url, start, end):
    response = session().get(url, headers={"Range": f"bytes={start}-{end}"}, timeout=60)
    if response.status_code != 206:
        raise RuntimeError(f"Range request returned {response.status_code}; refusing full ZIP download")
    response.raise_for_status()
    return response.content


class RemoteZip(io.RawIOBase):
    def __init__(self, url):
        self.url = url
        response = session().head(url, timeout=30)
        response.raise_for_status()
        self.size = int(response.headers["Content-Length"])
        self.position = 0

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else self.size + offset
        return self.position

    def read(self, size=-1):
        size = self.size - self.position if size < 0 else size
        if size > 32 * 1024 * 1024:
            raise RuntimeError("Unexpectedly large central-directory read")
        if size <= 0:
            return b""
        data = get_range(self.url, self.position, min(self.size - 1, self.position + size - 1))
        self.position += len(data)
        return data


def load_metadata(path):
    with path.open("rb") as stream:
        categories = {c["id"]: c["name"] for c in ijson.items(stream, "categories.item")}
    with path.open("rb") as stream:
        images = {image["id"]: image for image in ijson.items(stream, "images.item")}
    with path.open("rb") as stream:
        attributes = {a["id"]: a["name"] for a in ijson.items(stream, "attributes.item")}
    pools = defaultdict(list)
    with path.open("rb") as stream:
        for annotation in ijson.items(stream, "annotations.item"):
            label = MAPPING.get(categories.get(annotation["category_id"]))
            box = [float(v) for v in annotation["bbox"]]
            if not label or annotation.get("iscrowd") or min(box[2:]) < 40 or annotation["image_id"] not in images:
                continue
            names = [attributes.get(i, "") for i in annotation.get("attribute_ids", [])]
            sleeve = "sleeveless" if any("sleeveless" in n for n in names) else "short" if any("short" in n and "sleeve" in n for n in names) else "long" if any("long" in n and "sleeve" in n for n in names) else "unknown"
            pools[label].append({"id": int(annotation["id"]), "imageId": int(annotation["image_id"]), "garmentKey": label, "bbox": box, "sleeve": sleeve})
    return pools, images, categories


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--per-class", type=int, default=120)
    parser.add_argument("--test-per-class", type=int, default=30)
    parser.add_argument("--workers", type=int, default=6)
    options = parser.parse_args()
    directory = options.directory
    (directory / "images").mkdir(parents=True, exist_ok=True)
    train, train_images, categories = load_metadata(directory / "annotations-train.json")
    test, test_images, _ = load_metadata(directory / "annotations-val.json")
    rng = random.Random(42)
    selected = {"train": [], "test": []}
    for key in sorted(train):
        if len({r["imageId"] for r in train[key]}) < options.per_class or len({r["imageId"] for r in test[key]}) < options.test_per_class:
            print(f"Skipping scarce class {key}", flush=True)
            continue
        for split, source, maximum in (("train", train[key], options.per_class), ("test", test[key], options.test_per_class)):
            rng.shuffle(source)
            seen = set()
            for row in source:
                if row["imageId"] in seen:
                    continue
                seen.add(row["imageId"])
                selected[split].append(row)
                if len(seen) == maximum:
                    break
    print("Selected:", dict(Counter(row["garmentKey"] for row in selected["train"])), flush=True)
    records = []
    for partition, image_map, archive in (("train", train_images, "train2020.zip"), ("test", test_images, "val_test2020.zip")):
        (directory / "sources" / partition).mkdir(parents=True, exist_ok=True)
        url = BASE + "images/" + archive
        with zipfile.ZipFile(RemoteZip(url)) as remote:
            members = {Path(info.filename).name: info for info in remote.infolist() if not info.is_dir()}
        grouped = defaultdict(list)
        for row in selected[partition]:
            grouped[row["imageId"]].append(row)

        def download(group):
            image_id, rows = group
            image_record = image_map[image_id]
            filename = image_record["file_name"]
            info = members[Path(filename).name]
            cached = directory / "sources" / partition / Path(filename).name
            if cached.exists():
                content = cached.read_bytes()
            else:
                raw = get_range(url, info.header_offset, info.header_offset + info.compress_size + len(info.filename.encode("utf8")) + 4096)
                if raw[:4] != b"PK\x03\x04":
                    raise RuntimeError("Invalid ZIP local header")
                name_length, extra_length = struct.unpack_from("<HH", raw, 26)
                compressed = raw[30 + name_length + extra_length:30 + name_length + extra_length + info.compress_size]
                content = zlib.decompress(compressed, -15) if info.compress_type == 8 else compressed
            if zlib.crc32(content) != info.CRC:
                raise RuntimeError("Image CRC mismatch")
            if not cached.exists():
                cached.write_bytes(content)
            source_hash = hashlib.sha256(content).hexdigest()
            results = []
            with Image.open(io.BytesIO(content)) as opened:
                image = opened.convert("RGB")
                for row in rows:
                    x, y, width, height = row["bbox"]
                    bounds = (max(0, int(x)), max(0, int(y)), min(image.width, int(x + width)), min(image.height, int(y + height)))
                    if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
                        continue
                    target = f"images/{partition}-{row['id']}.jpg"
                    crop = image.crop(bounds)
                    crop.thumbnail((384, 384))
                    crop.save(directory / target, quality=92)
                    # Hash split is on source bytes, not a crop or file name.
                    split = "test" if partition == "test" else "validation" if int(source_hash[:8], 16) % 5 == 0 else "train"
                    results.append({"id": f"fashionpedia-{partition}-{row['id']}", "image": target, "group": source_hash, "garmentKey": row["garmentKey"], "split": split, "sleeve": row["sleeve"], "bbox": row["bbox"], "source": "Fashionpedia", "sourceImageId": image_id, "originalUrl": image_record.get("original_url"), "license": int(image_record.get("license", 0)), "bboxVerified": True})
            return results

        with ThreadPoolExecutor(max_workers=options.workers) as pool:
            futures = [pool.submit(download, group) for group in grouped.items()]
            for completed, future in enumerate(as_completed(futures), 1):
                records.extend(future.result())
                if completed % 100 == 0:
                    print(f"{partition}: downloaded {completed}/{len(futures)} source images", flush=True)
    # Also remove exact source-byte overlaps across official partitions.
    test_hashes = {r["group"] for r in records if r["split"] == "test"}
    records = [r for r in records if r["split"] == "test" or r["group"] not in test_hashes]
    manifest = {"version": "divara-fashionpedia-v1", "source": "https://github.com/cvdfoundation/fashionpedia", "annotationLicense": "CC BY 4.0; image licenses remain per source record", "seed": 42, "categories": {str(k): v for k, v in categories.items()}, "examples": sorted(records, key=lambda r: r["id"])}
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print("Ready:", dict(Counter(r["split"] for r in records)), flush=True)


if __name__ == "__main__":
    main()
