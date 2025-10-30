-- =====================================================
-- TEST PENDING TRANSFERS FUNCTIONALITY
-- =====================================================

-- Step 1: Check if ticket_transfers table exists and has data
-- =====================================================
SELECT 
    'TICKET_TRANSFERS TABLE CHECK' as info,
    COUNT(*) as total_transfers,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_transfers,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_transfers
FROM ticket_transfers;

-- Step 2: Check table structure
-- =====================================================
SELECT 
    'TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ticket_transfers' 
ORDER BY ordinal_position;

-- Step 3: Sample pending transfers (if any)
-- =====================================================
SELECT 
    'SAMPLE PENDING TRANSFERS' as info,
    id,
    recipient_email,
    recipient_phone,
    status,
    created_at
FROM ticket_transfers 
WHERE status = 'PENDING'
LIMIT 5;

-- Step 4: Check foreign key constraints
-- =====================================================
SELECT 
    'FOREIGN KEY CONSTRAINTS' as info,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'ticket_transfers';
