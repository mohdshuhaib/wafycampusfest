import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              sameSite: "lax",
              path: "/",
            })
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data) {
      user = data.user;
    }
  } catch (err) {
    user = null;
  }

  const url = request.nextUrl.clone();
  const isAdminPath = url.pathname.startsWith("/admin");
  const isCaptainPath = url.pathname.startsWith("/captain");
  const isJudgePath = url.pathname.startsWith("/judge");
  const isLoginPage = url.pathname === "/login";

  if (!user) {
    if (isAdminPath || isCaptainPath || isJudgePath) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (isLoginPage) {
    return response;
  }

  if (isAdminPath || isCaptainPath || isJudgePath) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role;

      if (isAdminPath && role !== "admin") {
        url.pathname = role === "judge" ? "/judge" : "/captain";
        return NextResponse.redirect(url);
      }

      if (isCaptainPath && role !== "captain") {
        url.pathname = role === "judge" ? "/judge" : "/admin";
        return NextResponse.redirect(url);
      }

      if (isJudgePath && role !== "judge" && role !== "admin") {
        url.pathname = role === "captain" ? "/captain" : "/admin";
        return NextResponse.redirect(url);
      }
    } catch (e) {
      console.warn("Middleware profile lookup warning:", e);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
