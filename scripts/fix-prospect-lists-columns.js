#!/usr/bin/env node

/**
 * Fix Prospect Lists Missing Columns
 * 
 * This script helps you add the missing default interlocuteur columns
 * to the prospect_lists table.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Prospect Lists Missing Columns...\n');

const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '005_add_default_interlocuteur_columns.sql');

if (fs.existsSync(migrationFile)) {
  console.log('📄 Migration file found: 005_add_default_interlocuteur_columns.sql');
  
  try {
    const migrationContent = fs.readFileSync(migrationFile, 'utf8');
    console.log('✅ Migration file is readable');
    console.log(`📝 Migration contains ${migrationContent.split('\n').length} lines`);
    
    console.log('\n🚀 To fix the issue, run this SQL in your Supabase SQL Editor:\n');
    console.log('=' .repeat(60));
    console.log(migrationContent);
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error(`❌ Error reading migration file:`, error.message);
  }
} else {
  console.log('❌ Migration file not found:', migrationFile);
}

console.log('\n📋 What this fixes:');
console.log('• Adds default_interlocuteur_name column');
console.log('• Adds default_interlocuteur_email column');
console.log('• Adds default_interlocuteur_phone column');
console.log('• Adds default_interlocuteur_position column');
console.log('\n💡 After running this migration, creating prospect lists should work without errors!');
