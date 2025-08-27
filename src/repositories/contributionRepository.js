const supabase = require('../utils/supabaseClient');

async function getContributionsByEmployeeId(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .order('calculated_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  return data;
}

async function getContributions(tenantId, page = 1, limit = 100) {
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('contributions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(offset, offset + limit - 1)
    .order('calculated_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount: count,
      totalPages: Math.ceil(count / limit)
    }
  };
}

async function createContribution(tenantId, contributionData) {
  const { data, error } = await supabase
    .from('contributions')
    .insert([{ 
      ...contributionData, 
      tenant_id: tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

async function getLatestContribution(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('employee_id', employeeId)
    .order('calculated_at', { ascending: false })
    .limit(1);
  
  if (error) throw new Error(error.message);
  return data[0] || null;
}

module.exports = {
  getContributionsByEmployeeId,
  getContributions,
  createContribution,
  getLatestContribution
};