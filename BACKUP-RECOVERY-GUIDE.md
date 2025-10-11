# 💾 Payment Backup & Recovery Guide

## 📋 **Overview**

This guide covers the comprehensive backup and recovery system for Temba's payment infrastructure. The system provides automated backups, point-in-time recovery, and data integrity verification.

## 🏗️ **System Architecture**

### **Components:**
1. **Backup Function** (`payment-backup`) - Creates backups on-demand
2. **Recovery Function** (`payment-recovery`) - Restores data from backups
3. **Database Schema** - Tracks backups, schedules, and recovery points
4. **Automation Scripts** - Handles scheduled backups and maintenance
5. **Monitoring Views** - Provides backup health insights

## 🔧 **Backup Types**

### **1. Payment Backups** (`payments`)
- **Content**: Payment records, transaction data, status history
- **Frequency**: Hourly (recommended)
- **Retention**: 7 days (default)
- **Use Case**: Quick recovery of payment issues

### **2. Order Backups** (`orders`)
- **Content**: Order records, customer info, ticket quantities
- **Frequency**: Daily
- **Retention**: 30 days
- **Use Case**: Order-related data recovery

### **3. Ticket Backups** (`tickets`)
- **Content**: Ticket records, validation status, event links
- **Frequency**: Daily
- **Retention**: 30 days
- **Use Case**: Ticket validation issues

### **4. Full Backups** (`full`)
- **Content**: All payment-related data (payments + orders + tickets)
- **Frequency**: Daily (recommended)
- **Retention**: 90 days
- **Use Case**: Complete system recovery

## 🚀 **Quick Start**

### **1. Manual Backup Creation**

#### **Using Supabase Function:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/payment-backup' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "backup_type": "full",
    "date_from": "2024-01-01T00:00:00Z",
    "date_to": "2024-01-02T00:00:00Z",
    "format": "json"
  }'
```

#### **Using Automation Script:**
```bash
# Create full backup for last 24 hours
./scripts/backup-automation.sh backup full json 1

# Create payments backup for last hour
./scripts/backup-automation.sh backup payments json 0
```

### **2. Automated Backup Setup**

#### **Daily Backup (Cron):**
```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/temba/scripts/backup-automation.sh daily >> /var/log/temba-backup.log 2>&1
```

#### **Weekly Backup (Cron):**
```bash
# Add to crontab
0 3 * * 0 /path/to/temba/scripts/backup-automation.sh weekly >> /var/log/temba-backup.log 2>&1
```

### **3. Environment Variables**
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
export BACKUP_WEBHOOK_URL="https://hooks.slack.com/..." # Optional notifications
```

## 🔄 **Recovery Procedures**

### **1. Backup Restoration**

#### **Restore from Specific Backup:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recovery_type": "backup_restore",
    "backup_id": "backup-uuid-here",
    "dry_run": true
  }'
```

#### **Point-in-Time Recovery:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recovery_type": "point_in_time",
    "target_time": "2024-01-01T12:00:00Z",
    "tables": ["payments", "orders"],
    "dry_run": false
  }'
```

### **2. Data Integrity Verification**

#### **Verify Backup Integrity:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recovery_type": "data_verification",
    "backup_id": "backup-uuid-here"
  }'
```

#### **General Data Check:**
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "recovery_type": "data_verification",
    "tables": ["payments", "orders", "tickets"]
  }'
```

## 📊 **Monitoring & Maintenance**

### **1. Backup Health Monitoring**

#### **Check Backup Status:**
```sql
-- View recent backup summary
SELECT * FROM backup_status_summary;

-- Check backup health for last 7 days
SELECT * FROM backup_health_check;

-- List recent backups
SELECT 
  id,
  backup_type,
  status,
  record_count,
  file_size_bytes / 1024 / 1024 as size_mb,
  created_at
FROM payment_backups 
ORDER BY created_at DESC 
LIMIT 10;
```

#### **Monitor Failed Backups:**
```sql
SELECT 
  backup_type,
  error_message,
  created_at
FROM payment_backups 
WHERE status = 'failed' 
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### **2. Cleanup & Maintenance**

#### **Manual Cleanup:**
```bash
# Clean backups older than 30 days
./scripts/backup-automation.sh cleanup 30

# Clean backups older than 7 days
./scripts/backup-automation.sh cleanup 7
```

#### **Automated Cleanup (SQL):**
```sql
-- Run cleanup function
SELECT cleanup_expired_backups();

-- Check what would be cleaned up
SELECT 
  id,
  backup_type,
  created_at,
  expires_at
FROM payment_backups 
WHERE expires_at < NOW() 
  AND status = 'completed';
```

## 🚨 **Emergency Recovery Procedures**

### **Scenario 1: Payment Data Corruption**

1. **Immediate Assessment:**
   ```bash
   # Verify current data integrity
   curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"recovery_type": "data_verification", "tables": ["payments"]}'
   ```

2. **Find Last Good Backup:**
   ```sql
   SELECT id, created_at, record_count 
   FROM payment_backups 
   WHERE backup_type IN ('payments', 'full') 
     AND status = 'completed'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Dry Run Recovery:**
   ```bash
   # Test recovery without making changes
   curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "recovery_type": "backup_restore",
       "backup_id": "BACKUP_ID_HERE",
       "dry_run": true
     }'
   ```

4. **Execute Recovery:**
   ```bash
   # Actual recovery (remove dry_run or set to false)
   curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "recovery_type": "backup_restore",
       "backup_id": "BACKUP_ID_HERE",
       "dry_run": false
     }'
   ```

### **Scenario 2: Complete System Recovery**

1. **Create Recovery Point:**
   ```sql
   SELECT create_recovery_point(
     'Emergency Recovery Point',
     'Created for complete system recovery',
     '2024-01-01 12:00:00'::timestamp
   );
   ```

2. **Point-in-Time Recovery:**
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/payment-recovery' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "recovery_type": "point_in_time",
       "target_time": "2024-01-01T12:00:00Z",
       "dry_run": false
     }'
   ```

## 📋 **Best Practices**

### **1. Backup Strategy**
- ✅ **Multiple Backup Types**: Use both incremental (payments) and full backups
- ✅ **Regular Testing**: Test recovery procedures monthly
- ✅ **Offsite Storage**: Consider storing critical backups in external storage
- ✅ **Monitoring**: Set up alerts for backup failures
- ✅ **Documentation**: Keep recovery procedures updated

### **2. Recovery Planning**
- ✅ **Recovery Time Objective (RTO)**: Target < 4 hours for critical data
- ✅ **Recovery Point Objective (RPO)**: Target < 1 hour data loss maximum
- ✅ **Testing**: Regular disaster recovery drills
- ✅ **Communication**: Clear escalation procedures
- ✅ **Validation**: Always verify recovered data integrity

### **3. Security**
- ✅ **Access Control**: Limit backup/recovery access to authorized personnel
- ✅ **Encryption**: Encrypt backup data at rest and in transit
- ✅ **Audit Trail**: Log all backup and recovery operations
- ✅ **Retention**: Follow data retention policies and regulations

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Backup Creation Fails**
```bash
# Check function logs
supabase functions logs payment-backup

# Verify permissions
# Check if service role has access to all required tables

# Test with smaller date range
curl -X POST 'https://your-project.supabase.co/functions/v1/payment-backup' \
  -d '{"backup_type": "payments", "date_from": "2024-01-01T00:00:00Z", "date_to": "2024-01-01T01:00:00Z"}'
```

#### **Recovery Function Timeout**
```bash
# Use smaller recovery batches
# Implement chunked recovery for large datasets
# Check database connection limits
```

#### **Backup Integrity Validation Fails**
```sql
-- Check for data inconsistencies
SELECT 
  backup_type,
  record_count,
  (SELECT COUNT(*) FROM payments WHERE created_at >= date_from AND created_at <= date_to) as actual_count
FROM payment_backups 
WHERE id = 'BACKUP_ID';
```

## 📞 **Support & Escalation**

### **Emergency Contacts:**
- **Primary**: System Administrator
- **Secondary**: Database Administrator  
- **Escalation**: Technical Lead

### **Recovery SLA:**
- **Critical**: 2 hours response, 4 hours resolution
- **High**: 4 hours response, 8 hours resolution
- **Medium**: 8 hours response, 24 hours resolution

---

## 🎯 **Quick Reference Commands**

```bash
# Daily backup
./scripts/backup-automation.sh daily

# Create full backup
./scripts/backup-automation.sh backup full

# Verify backup file
./scripts/backup-automation.sh verify backup.json

# Cleanup old backups
./scripts/backup-automation.sh cleanup 30

# Check backup health
psql -c "SELECT * FROM backup_health_check;"

# Emergency recovery (dry run)
curl -X POST 'https://project.supabase.co/functions/v1/payment-recovery' \
  -H 'Authorization: Bearer KEY' \
  -d '{"recovery_type": "data_verification"}'
```

**Remember: Always test recovery procedures in a non-production environment first!** 🛡️


