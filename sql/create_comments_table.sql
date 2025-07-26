-- Create recipe_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.recipe_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL CHECK (length(text) <= 500),
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    
    -- Indexes for performance
    CONSTRAINT recipe_comments_text_not_empty CHECK (length(trim(text)) > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe_id ON public.recipe_comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_user_id ON public.recipe_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_created_at ON public.recipe_comments(created_at DESC);

-- Add comments_count column to recipes table if it doesn't exist
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);

-- Create trigger to update comments_count automatically
CREATE OR REPLACE FUNCTION update_recipe_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.recipes 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.recipe_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.recipes 
        SET comments_count = GREATEST(0, comments_count - 1) 
        WHERE id = OLD.recipe_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_update_comments_count ON public.recipe_comments;
CREATE TRIGGER trigger_update_comments_count
    AFTER INSERT OR DELETE ON public.recipe_comments
    FOR EACH ROW EXECUTE FUNCTION update_recipe_comments_count();

-- RLS Policies
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read comments
CREATE POLICY "Anyone can view recipe comments" ON public.recipe_comments
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own comments
CREATE POLICY "Users can insert their own comments" ON public.recipe_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments" ON public.recipe_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" ON public.recipe_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.recipe_comments TO authenticated;
GRANT SELECT ON public.recipe_comments TO anon;
