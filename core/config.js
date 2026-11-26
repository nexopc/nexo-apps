// Conexión con Supabase (base de datos de la red NEXO).
// La URL y la clave publicable son PÚBLICAS por diseño: lo que protege tus datos son las reglas RLS
// (cada fila solo la ve su dueño). Las claves secretas nunca van aquí.
export const SUPABASE_URL = 'https://tfdxuqvsqdrvbgujooya.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_QZE-PJSRxAnaymQ03ephDg_wm6V4mUy';
export const HARVEY_URL = SUPABASE_URL + '/functions/v1/harvey';
export const hasCloud = () => !!(SUPABASE_URL && SUPABASE_KEY);
