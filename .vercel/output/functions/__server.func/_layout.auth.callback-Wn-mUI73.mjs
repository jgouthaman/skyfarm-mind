import { r as reactExports, j as jsxRuntimeExports } from "./_libs/react.mjs";
import { d as useNavigate } from "./_libs/tanstack__react-router.mjs";
import { s as supabase } from "./_ssr/client-DYtC4Igq.mjs";
import { a as Route } from "./_ssr/router-DRZUT5O3.mjs";
import "./_libs/tanstack__router-core.mjs";
import "./_libs/tanstack__history.mjs";
import "./_libs/cookie-es.mjs";
import "./_libs/seroval.mjs";
import "./_libs/seroval-plugins.mjs";
import "node:stream/web";
import "node:stream";
import "./_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "./_libs/isbot.mjs";
import "./_libs/supabase__supabase-js.mjs";
import "./_libs/supabase__postgrest-js.mjs";
import "./_libs/supabase__realtime-js.mjs";
import "./_libs/supabase__phoenix.mjs";
import "./_libs/supabase__storage-js.mjs";
import "./_libs/iceberg-js.mjs";
import "./_libs/supabase__auth-js.mjs";
import "tslib";
import "./_libs/supabase__functions-js.mjs";
import "./_libs/tanstack__query-core.mjs";
import "./_libs/tanstack__react-query.mjs";
function AuthCallbackPage() {
  const navigate = useNavigate();
  const {
    code
  } = Route.useSearch();
  reactExports.useEffect(() => {
    if (!code) {
      navigate({
        to: "/learn"
      });
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({
      error
    }) => {
      if (error) {
        navigate({
          to: "/learn"
        });
      } else {
        navigate({
          to: "/learn/drone-design-fundamentals"
        });
      }
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-background flex flex-col items-center justify-center gap-4", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-muted", style: {
      borderTopColor: "#2a78d6"
    } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground", children: "Signing you in..." })
  ] });
}
export {
  AuthCallbackPage as component
};
