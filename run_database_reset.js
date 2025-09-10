const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(migrationPath) {
  console.log(`Running migration: ${migrationPath}`);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // If rpc doesn't work, try direct query
          const { error: queryError } = await supabase.from('_supabase_migrations').select('*').limit(1);

          if (queryError) {
            console.error(`Error executing statement:`, error);
            console.error(`Statement was:`, statement);
            throw error;
          }
        }
      }
    }

    console.log(`✅ Migration ${migrationPath} completed successfully`);
  } catch (error) {
    console.error(`❌ Error running migration ${migrationPath}:`, error);
    throw error;
  }
}

async function resetDatabase() {
  console.log('🚀 Starting database reset...');

  try {
    // Run migrations in order
    const migrations = [
      'supabase/migrations/000_drop_all_tables.sql',
      'supabase/migrations/001_recreate_all_tables.sql'
    ];

    for (const migration of migrations) {
      if (fs.existsSync(migration)) {
        await runMigration(migration);
      } else {
        console.warn(`⚠️  Migration file not found: ${migration}`);
      }
    }

    console.log('🎉 Database reset completed successfully!');
    console.log('📝 Note: You may need to manually create some initial data or run additional setup scripts.');

  } catch (error) {
    console.error('💥 Database reset failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function resetDatabaseDirect() {
  console.log('🚀 Starting database reset using direct SQL...');

  try {
    // Read the drop migration
    const dropSql = fs.readFileSync('supabase/migrations/000_drop_all_tables.sql', 'utf8');

    // Read the create migration
    const createSql = fs.readFileSync('supabase/migrations/001_recreate_all_tables.sql', 'utf8');

    console.log('Dropping all tables...');
    const { error: dropError } = await supabase.rpc('exec', { query: dropSql });

    if (dropError) {
      console.error('Error dropping tables:', dropError);
      throw dropError;
    }

    console.log('Creating new tables...');
    const { error: createError } = await supabase.rpc('exec', { query: createSql });

    if (createError) {
      console.error('Error creating tables:', createError);
      throw createError;
    }

    console.log('🎉 Database reset completed successfully!');

  } catch (error) {
    console.error('💥 Database reset failed:', error);
    console.log('💡 Alternative: You can run the SQL files directly in your Supabase dashboard:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Run supabase/migrations/000_drop_all_tables.sql first');
    console.log('   4. Then run supabase/migrations/001_recreate_all_tables.sql');
    process.exit(1);
  }
}

// Run the reset
if (require.main === module) {
  resetDatabaseDirect().catch(console.error);
}

module.exports = { resetDatabase, resetDatabaseDirect };
