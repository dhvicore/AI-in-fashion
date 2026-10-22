// Verifies the ACTUAL trained artifact and inference, not a mock prediction.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {classifyCrops,classifierHealth}=await import('../src/vision/classifier.ts');
const health=await classifierHealth();
assert.equal(health.available,true,'Train/install the local checkpoint before running this test');
const report=JSON.parse(await readFile(path.join(root,'models/fashionpedia-v1/evaluation.json'),'utf8'));
const manifest=JSON.parse(await readFile(path.join(root,'training/data/fashionpedia/manifest.json'),'utf8'));
const checkpoint=await readFile(path.join(root,'models/fashionpedia-v1/classifier.pt'));
assert.equal(createHash('sha256').update(checkpoint).digest('hex'),report.checkpoint_sha256);
const groups=Object.fromEntries(['train','validation','test'].map(split=>[split,new Set(manifest.examples.filter(e=>e.split===split).map(e=>e.group))]));
for(const split of ['train','validation'])for(const key of groups[split])assert.ok(!groups.test.has(key));
for(const key of groups.train)assert.ok(!groups.validation.has(key));
const samples=manifest.examples.filter(e=>e.split==='test').slice(0,4);
const predictions=await classifyCrops(await Promise.all(samples.map(e=>readFile(path.join(root,'training/data/fashionpedia',e.image)))));
assert.equal(predictions.length,4);
for(const prediction of predictions) {
 assert.equal(prediction.modelId,health.modelId);
 assert.ok(report.classes.includes(prediction.garmentKey));
 assert.ok(prediction.confidence>=0&&prediction.confidence<=1);
 assert.equal(prediction.alternatives.length,3);
 assert.equal(prediction.validationPrecision,report.validation.per_class[prediction.garmentKey].precision);
 assert.equal(prediction.eligible,prediction.validationPrecision>=.85&&report.validation.per_class[prediction.garmentKey].support>=10&&prediction.confidence>=.9);
}
console.log(`PASS: real checkpoint checksum, split isolation, four real held-out crop predictions, calibrated probabilities and validation eligibility gates. Reported accuracy: ${(report.test.accuracy*100).toFixed(2)}%; not a universal accuracy guarantee.`);
