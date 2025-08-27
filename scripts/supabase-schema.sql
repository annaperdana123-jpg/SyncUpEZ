-- Supabase Schema Definitions

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  team TEXT,
  role TEXT,
  hire_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  from_employee_id TEXT NOT NULL,
  to_employee_id TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  content TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create kudos table
CREATE TABLE IF NOT EXISTS kudos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  from_employee_id TEXT NOT NULL,
  to_employee_id TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create contributions table
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  problem_solving_score NUMERIC(5,2),
  collaboration_score NUMERIC(5,2),
  initiative_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Employees are viewable by tenant" 
ON employees FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Employees are insertable by tenant" 
ON employees FOR INSERT 
WITH CHECK (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Employees are updateable by tenant" 
ON employees FOR UPDATE 
USING (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Employees are deletable by tenant" 
ON employees FOR DELETE 
USING (tenant_id = current_setting('app.tenant_id'));

-- Create policies for interactions table
CREATE POLICY "Interactions are viewable by tenant" 
ON interactions FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Interactions are insertable by tenant" 
ON interactions FOR INSERT 
WITH CHECK (tenant_id = current_setting('app.tenant_id'));

-- Create policies for kudos table
CREATE POLICY "Kudos are viewable by tenant" 
ON kudos FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Kudos are insertable by tenant" 
ON kudos FOR INSERT 
WITH CHECK (tenant_id = current_setting('app.tenant_id'));

-- Create policies for contributions table
CREATE POLICY "Contributions are viewable by tenant" 
ON contributions FOR SELECT 
USING (tenant_id = current_setting('app.tenant_id'));

CREATE POLICY "Contributions are insertable by tenant" 
ON contributions FOR INSERT 
WITH CHECK (tenant_id = current_setting('app.tenant_id'));

-- Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create functions for schema initialization (used by init script)
CREATE OR REPLACE FUNCTION create_employees_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT,
    team TEXT,
    role TEXT,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_interactions_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    from_employee_id TEXT NOT NULL,
    to_employee_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    content TEXT,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_kudos_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS kudos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    from_employee_id TEXT NOT NULL,
    to_employee_id TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_contributions_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    problem_solving_score NUMERIC(5,2),
    collaboration_score NUMERIC(5,2),
    initiative_score NUMERIC(5,2),
    overall_score NUMERIC(5,2),
    calculated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_tenants_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_rls_policies()
RETURNS VOID AS $$
BEGIN
  -- Enable Row Level Security on all tables
  ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE kudos ENABLE ROW LEVEL SECURITY;
  ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

  -- Create policies for employees table
  DROP POLICY IF EXISTS "Employees are viewable by tenant" ON employees;
  DROP POLICY IF EXISTS "Employees are insertable by tenant" ON employees;
  DROP POLICY IF EXISTS "Employees are updateable by tenant" ON employees;
  DROP POLICY IF EXISTS "Employees are deletable by tenant" ON employees;

  CREATE POLICY "Employees are viewable by tenant" 
  ON employees FOR SELECT 
  USING (tenant_id = current_setting('app.tenant_id'));

  CREATE POLICY "Employees are insertable by tenant" 
  ON employees FOR INSERT 
  WITH CHECK (tenant_id = current_setting('app.tenant_id'));

  CREATE POLICY "Employees are updateable by tenant" 
  ON employees FOR UPDATE 
  USING (tenant_id = current_setting('app.tenant_id'));

  CREATE POLICY "Employees are deletable by tenant" 
  ON employees FOR DELETE 
  USING (tenant_id = current_setting('app.tenant_id'));

  -- Create policies for interactions table
  DROP POLICY IF EXISTS "Interactions are viewable by tenant" ON interactions;
  DROP POLICY IF EXISTS "Interactions are insertable by tenant" ON interactions;

  CREATE POLICY "Interactions are viewable by tenant" 
  ON interactions FOR SELECT 
  USING (tenant_id = current_setting('app.tenant_id'));

  CREATE POLICY "Interactions are insertable by tenant" 
  ON interactions FOR INSERT 
  WITH CHECK (tenant_id = current_setting('app.tenant_id'));

  -- Create policies for kudos table
  DROP POLICY IF EXISTS "Kudos are viewable by tenant" ON kudos;
  DROP POLICY IF EXISTS "Kudos are insertable by tenant" ON kudos;

  CREATE POLICY "Kudos are viewable by tenant" 
  ON kudos FOR SELECT 
  USING (tenant_id = current_setting('app.tenant_id'));

  CREATE POLICY "Kudos are insertable by tenant" 
  ON kudos FOR INSERT 
  WITH CHECK (tenant_id = current_setting('app.tenant_id'));

  -- Create policies for contributions table
  DROP POLICY IF EXISTS "Contributions are viewable by tenant" ON contributions;
  DROP POLICY IF EXISTS "Contributions are insertable by tenant" ON contributions;

  CREATE POLICY "Contributions are viewable by tenant" 
  ON contributions FOR SELECT 
  USING (tenant_id = current_setting('app.tenant_id'));

  CREATE POLICY "Contributions are insertable by tenant" 
  ON contributions FOR INSERT 
  WITH CHECK (tenant_id = current_setting('app.tenant_id'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_tenant_context_function()
RETURNS VOID AS $$
BEGIN
  CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id TEXT)
  RETURNS VOID AS $$
  BEGIN
    PERFORM set_config('app.tenant_id', tenant_id, false);
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
END;
$$ LANGUAGE plpgsql;