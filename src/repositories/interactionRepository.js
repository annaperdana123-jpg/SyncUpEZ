const supabase = require('../utils/supabaseClient');

async function getInteractions(tenantId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('interactions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .range(offset, offset + limit - 1);
  
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

async function getInteractionsByEmployeeId(tenantId, employeeId) {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('to_employee_id', employeeId);
  
  if (error) throw new Error(error.message);
  return data;
}

async function createInteraction(tenantId, interactionData) {
  const { data, error } = await supabase
    .from('interactions')
    .insert([{ 
      ...interactionData, 
      tenant_id: tenantId
    }])
    .select();
  
  if (error) throw new Error(error.message);
  return data[0];
}

module.exports = {
  getInteractions,
  getInteractionsByEmployeeId,
  createInteraction
};