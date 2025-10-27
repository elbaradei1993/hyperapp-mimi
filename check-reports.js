// HyperApp Report Validation Script
// This script validates the database schema and report functionality

class ReportValidator {
  constructor() {
    this.issues = [];
    this.supabase = null;
    this.isValid = true;
  }

  async validateSchema() {
    console.log('🔍 Validating database schema...');

    // Check if required tables exist
    const requiredTables = ['reports', 'users', 'votes', 'mood_votes'];
    const missingTables = [];

    for (const table of requiredTables) {
      const exists = await this.tableExists(table);
      if (!exists) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      this.issues.push(`Missing tables: ${missingTables.join(', ')}`);
      this.isValid = false;
      console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All required tables exist');
    }

    // Check specific table structures
    await this.validateReportsTable();
    await this.validateUsersTable();

    return this.isValid;
  }

  async tableExists(tableName) {
    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }

  async validateReportsTable() {
    try {
      const { data, error } = await this.supabase
        .from('reports')
        .select('id, vibe_type, location, notes, created_at, upvotes, downvotes')
        .limit(1);

      if (error) {
        this.issues.push('Reports table structure issue: ' + error.message);
        this.isValid = false;
      } else {
        console.log('✅ Reports table structure is valid');
      }
    } catch (error) {
      this.issues.push('Cannot access reports table');
      this.isValid = false;
    }
  }

  async validateUsersTable() {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('user_id, username, reputation, language')
        .limit(1);

      if (error) {
        this.issues.push('Users table structure issue: ' + error.message);
        this.isValid = false;
      } else {
        console.log('✅ Users table structure is valid');
      }
    } catch (error) {
      this.issues.push('Cannot access users table');
      this.isValid = false;
    }
  }

  async testReportInsertion() {
    console.log('🧪 Testing report insertion...');

    try {
      // Create a test report
      const testReport = {
        user_id: null, // Anonymous
        vibe_type: 'calm',
        location: 'Test Location',
        notes: 'Test report from validation script'
      };

      const { data, error } = await this.supabase
        .from('reports')
        .insert([testReport])
        .select();

      if (error) {
        this.issues.push('Report insertion failed: ' + error.message);
        this.isValid = false;
        console.error('❌ Report insertion failed:', error.message);
      } else {
        console.log('✅ Report insertion works');
        // Clean up test report
        await this.supabase
          .from('reports')
          .delete()
          .eq('id', data[0].id);
      }
    } catch (error) {
      this.issues.push('Report insertion error: ' + error.message);
      this.isValid = false;
    }
  }

  getValidationReport() {
    return {
      isValid: this.isValid,
      issues: this.issues,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.issues.length === 0) {
      return ['All checks passed! Database is properly configured.'];
    }

    if (this.issues.some(issue => issue.includes('Missing tables'))) {
      recommendations.push('Run the SQL setup script to create missing tables');
    }

    if (this.issues.some(issue => issue.includes('structure'))) {
      recommendations.push('Check and correct table structure according to schema documentation');
    }

    if (this.issues.some(issue => issue.includes('insertion'))) {
      recommendations.push('Verify database permissions and RLS policies');
    }

    return recommendations;
  }

  async runFullValidation() {
    console.log('🚀 Starting full validation...');

    // Initialize Supabase using singleton manager
    if (window.supabaseClientManager && window.appConfig) {
      this.supabase = window.supabaseClientManager.initialize(
        window.appConfig.supabaseUrl,
        window.appConfig.supabaseKey
      );
    } else {
      console.error('Supabase client manager not available or app config missing');
      return false;
    }

    await this.validateSchema();
    await this.testReportInsertion();

    const report = this.getValidationReport();

    console.log('📊 Validation Report:');
    console.log('Is Valid:', report.isValid);
    console.log('Issues Found:', report.issues.length);
    if (report.issues.length > 0) {
      report.issues.forEach(issue => console.log('  -', issue));
    }
    console.log('Recommendations:', report.recommendations.join('; '));

    return report;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportValidator;
} else {
  window.ReportValidator = ReportValidator;
}
