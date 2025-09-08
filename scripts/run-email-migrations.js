#!/usr/bin/env node

/**
 * Email System Database Migration Script
 * Runs the email system database migrations
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigrations() {
  console.log('🚀 Starting Email System Database Migrations...\n');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations', 'emails');

  try {
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      throw new Error('Migrations directory not found');
    }

    // Get all SQL files in order
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files:`);
    files.forEach(file => console.log(`  - ${file}`));
    console.log('');

    // Run each migration
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`📄 Running migration: ${file}`);

      const sql = fs.readFileSync(filePath, 'utf8');

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error(`❌ Error in ${file}:`, error);
        throw error;
      }

      console.log(`✅ ${file} completed successfully\n`);
    }

    console.log('🎉 All email system migrations completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run the application to test the database schema');
    console.log('2. Start implementing the email configuration page');
    console.log('3. Build the personal inbox interface');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migrations
runMigrations();

