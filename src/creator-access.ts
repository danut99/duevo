import type {User} from '@supabase/supabase-js';
// Controls visibility of the marketing workspace only. Campaign media are
// intentionally public promotional assets, never private customer documents.
// Always use auth.getUser() to validate this identity, not editable user metadata.
export function isCreatorAccount(user:User|null|undefined){
 return !!user?.email_confirmed_at&&user.email?.trim().toLowerCase()==='bocadanut99@gmail.com';
}
