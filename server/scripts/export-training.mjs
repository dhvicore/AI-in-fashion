import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const {env}=await import('../src/env.ts');
const {prisma}=await import('../src/lib/db.ts');
const {trainingManifest}=await import('../src/training/labels.ts');
const args=process.argv.slice(2);
const value=(flag)=>args[args.indexOf(flag)+1];
if(!args.includes('--user-email')||!args.includes('--out'))throw new Error('Usage: npm run training:export -- --user-email your@email --out /absolute/new/dataset-directory');
const output=path.resolve(value('--out'));
try {
 const user=await prisma.user.findUnique({where:{email:value('--user-email')}});
 if(!user)throw new Error('Account not found');
 const manifest=await trainingManifest(user.id);
 // Never overwrite an existing dataset or mix old labels into a fresh export.
 await mkdir(output,{recursive:false});
 await mkdir(path.join(output,'images'));
 const examples=[];
 for(const row of manifest.examples) {
  const filename=path.basename(row.image);
  await copyFile(path.join(env.uploadDir,filename),path.join(output,'images',filename));
  examples.push({...row,image:`images/${filename}`});
 }
 await writeFile(path.join(output,'manifest.json'),JSON.stringify({...manifest,examples},null,2));
 console.log(`Exported ${examples.length} confirmed crops. Train: ${examples.filter(e=>e.split==='train').length}; validation: ${examples.filter(e=>e.split==='validation').length}. No model was trained.`);
} finally {await prisma.$disconnect();}
