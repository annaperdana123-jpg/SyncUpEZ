const supabase = require('../utils/supabaseClient');

/**
 * Tenant Repository
 * Handles database operations for tenant management
 */

/**
 * Create a new tenant in the database
 * @param {string} tenantId - Unique identifier for the tenant
 * @param {Object} tenantData - Additional tenant data (name, contact, etc.)
 * @returns {Promise<Object>} - Created tenant record
 */
async function createTenant(tenantId, tenantData = {}) {
  const { data, error } = await supabase
    .from('tenants')
    .insert([{ 
      tenant_id: tenantId,
      name: tenantData.name || '',
      description: tenantData.description || '',
      contact_email: tenantData.contact_email || '',
      created_at: new Date().toISOString()
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

/**
 * Get tenant information by ID
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Tenant information
 */
async function getTenantById(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

/**
 * List all tenants
 * @returns {Promise<Array>} - List of all tenants
 */
async function listTenants() {
  const { data, error } = await supabase
    .from('tenants')
    .select('*');
  
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete a tenant by ID
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} - Deleted tenant record
 */
async function deleteTenant(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .delete()
    .eq('tenant_id', tenantId)
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

/**
 * Check if a tenant exists
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<boolean>} - Whether the tenant exists
 */
async function tenantExists(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('tenant_id')
    .eq('tenant_id', tenantId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
    throw new Error(error.message);
  }
  
  return !!data;
}

module.exports = {
  createTenant,
  getTenantById,
  listTenants,
  deleteTenant,
  tenantExists
};