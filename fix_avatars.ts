
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAvatars() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .not('avatar_url', 'is', null);

  for (const profile of profiles) {
    if (profile.avatar_url && !profile.avatar_url.includes('token=')) {
      const urlParts = profile.avatar_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { data, error } = await supabase.storage
        .from('user-avatars')
        .createSignedUrl(fileName, 315360000); // 10 years

      if (data?.signedUrl) {
        console.log(`Updating ${profile.id} with signed URL`);
        await supabase
          .from('profiles')
          .update({ avatar_url: data.signedUrl })
          .eq('id', profile.id);
      }
    }
  }
}

fixAvatars();
