-- Enable real-time updates for subscriptions table
ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.subscriptions;