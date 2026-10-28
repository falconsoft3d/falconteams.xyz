// Script que aplica el tema y el estado del menú lateral guardados antes del
// primer pintado (sin parpadeo). "system" sigue la preferencia del sistema operativo.

export const THEME_KEY = "ft-theme";

export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);if(localStorage.getItem("ft-sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}})()`;
