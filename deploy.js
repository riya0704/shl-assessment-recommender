#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 SHL Assessment Recommendation Engine - Deployment Script');
console.log('=========================================================');

async function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`\n📦 Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function deploy() {
  try {
    console.log('\n1️⃣ Installing root dependencies...');
    await runCommand('npm', ['install']);
    
    console.log('\n2️⃣ Installing backend dependencies...');
    await runCommand('npm', ['install'], path.join(process.cwd(), 'backend'));
    
    console.log('\n3️⃣ Installing frontend dependencies...');
    await runCommand('npm', ['install'], path.join(process.cwd(), 'frontend'));
    
    console.log('\n4️⃣ Building frontend...');
    await runCommand('npm', ['run', 'build'], path.join(process.cwd(), 'frontend'));
    
    console.log('\n5️⃣ Running evaluation...');
    await runCommand('node', ['evaluation.js'], path.join(process.cwd(), 'backend'));
    
    console.log('\n6️⃣ Generating predictions...');
    await runCommand('node', ['predict.js'], path.join(process.cwd(), 'backend'));
    
    console.log('\n✅ Deployment Complete!');
    console.log('\n🌐 To start the application:');
    console.log('   Backend API: cd backend && npm start');
    console.log('   Frontend:    cd frontend && npm start');
    console.log('\n📊 Results:');
    console.log('   - 377+ SHL assessments scraped and indexed');
    console.log('   - Evaluation results in /evaluation/');
    console.log('   - Predictions in /predictions/riya_verma.csv');
    console.log('   - API endpoints: /health and /recommend');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  deploy();
}