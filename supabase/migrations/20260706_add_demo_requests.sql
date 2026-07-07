-- Public "Request a Demo" lead form — reviewed and approved manually by staff.
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  business_type TEXT,
  company_size TEXT,
  interests TEXT[] DEFAULT '{}',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Zero-policy RLS: no anon/authenticated access — all reads/writes go through
-- service-role-backed API routes (api/request-demo.js, Admin Portal actions).
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON public.demo_requests(status);
