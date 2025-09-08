-- Create trigger to update prospect count when prospects are added or deleted
CREATE OR REPLACE FUNCTION update_prospect_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment prospect count
    UPDATE public.prospect_lists
    SET prospect_count = prospect_count + 1
    WHERE id = NEW.list_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement prospect count
    UPDATE public.prospect_lists
    SET prospect_count = GREATEST(prospect_count - 1, 0)
    WHERE id = OLD.list_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for prospect count updates
DROP TRIGGER IF EXISTS trigger_prospect_insert_count ON public.prospects;
CREATE TRIGGER trigger_prospect_insert_count
AFTER INSERT ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION update_prospect_count();

DROP TRIGGER IF EXISTS trigger_prospect_delete_count ON public.prospects;
CREATE TRIGGER trigger_prospect_delete_count
AFTER DELETE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION update_prospect_count();

-- Create function to update prospect count for a list
CREATE OR REPLACE FUNCTION update_list_prospect_count(list_id_param uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  count_val integer;
BEGIN
  -- Get actual count
  SELECT COUNT(*) INTO count_val
  FROM public.prospects
  WHERE list_id = list_id_param;
  
  -- Update list with actual count
  UPDATE public.prospect_lists
  SET prospect_count = count_val,
      updated_at = now()
  WHERE id = list_id_param;
END;
$$;

-- Create function to detect phone numbers in prospect data
CREATE OR REPLACE FUNCTION detect_phone_numbers()
RETURNS TRIGGER AS $$
DECLARE
  phone_regex text := '^\+?[\d\s\-\(\)\.]{7,20}$';
  col_name text;
  col_value text;
  found_phone boolean := false;
  phone_col text := null;
  phone_val text := null;
BEGIN
  -- Check each column in the data JSONB
  FOR col_name, col_value IN SELECT * FROM jsonb_each_text(NEW.data)
  LOOP
    -- Check if the value matches phone pattern
    IF col_value ~ phone_regex THEN
      found_phone := true;
      phone_col := col_name;
      phone_val := col_value;
      EXIT; -- Stop after finding first phone
    END IF;
  END LOOP;
  
  -- Update the prospect record with phone information
  NEW.has_phone := found_phone;
  NEW.phone_column := phone_col;
  NEW.phone_number := phone_val;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to detect phones on insert or update
DROP TRIGGER IF EXISTS trigger_detect_phones ON public.prospects;
CREATE TRIGGER trigger_detect_phones
BEFORE INSERT OR UPDATE OF data ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION detect_phone_numbers();
