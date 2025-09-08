import { supabase } from '../lib/supabase-client';

export const checkNotificationSchema = async () => {
  try {
    console.log('🔍 Checking notifications table schema...');
    
    // First, try to get the table structure by querying information_schema
    const { data: columns, error: schemaError } = await supabase.rpc('get_table_columns', {
      table_name: 'notifications'
    });

    if (schemaError) {
      console.log('Schema RPC failed, trying direct query...');
      
      // Alternative: try a simple select to see what columns exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('Error querying notifications table:', sampleError);
        
        // Check if table exists at all
        const { data: tableExists, error: tableError } = await supabase
          .from('notifications')
          .select('count', { count: 'exact', head: true });

        if (tableError) {
          console.error('❌ Notifications table does not exist:', tableError);
          return {
            exists: false,
            error: tableError.message,
            suggestion: 'Run the notifications migration to create the table'
          };
        }
      } else {
        console.log('✅ Notifications table exists');
        console.log('Sample data structure:', sampleData?.[0] || 'No data found');
        
        if (sampleData?.[0]) {
          const columns = Object.keys(sampleData[0]);
          console.log('Available columns:', columns);
          
          const hasDataColumn = columns.includes('data');
          console.log(`Data column exists: ${hasDataColumn ? '✅' : '❌'}`);
          
          return {
            exists: true,
            columns,
            hasDataColumn,
            sampleData: sampleData[0]
          };
        }
      }
    } else {
      console.log('✅ Got schema info:', columns);
      return {
        exists: true,
        columns: columns,
        hasDataColumn: columns?.some((col: any) => col.column_name === 'data')
      };
    }

    // If we get here, table exists but has no data, let's check basic structure
    const { data: emptyResult, error: emptyError } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, read_at, created_at, updated_at')
      .limit(0);

    if (!emptyError) {
      console.log('✅ Basic notifications structure confirmed');
      
      // Try to check if data column exists by attempting to select it
      const { error: dataColumnError } = await supabase
        .from('notifications')
        .select('data')
        .limit(0);

      const hasDataColumn = !dataColumnError;
      console.log(`Data column exists: ${hasDataColumn ? '✅' : '❌'}`);

      return {
        exists: true,
        hasDataColumn,
        basicColumns: ['id', 'user_id', 'type', 'title', 'message', 'read_at', 'created_at', 'updated_at'],
        error: hasDataColumn ? null : 'Missing data column'
      };
    }

    return {
      exists: false,
      error: 'Could not determine table structure'
    };

  } catch (error: any) {
    console.error('Error checking notification schema:', error);
    return {
      exists: false,
      error: error.message
    };
  }
};

// Add to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).checkNotificationSchema = checkNotificationSchema;
}
