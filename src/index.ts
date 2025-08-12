export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS configuration using environment variable
    // Set ALLOWED_ORIGIN in your Worker's environment variables
    // Examples: "https://example.com" or "*" for all origins
    const allowedOrigin = env.ALLOWED_ORIGIN || "*";
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400", // 24 hours
    };

    // Handle preflight OPTIONS request
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle POST request to insert email
    if (method === "POST" && url.pathname === "/api/email") {
      try {
        // Parse the request body
        const body = await request.json();
        const { email } = body;

        // Validate email
        if (!email || typeof email !== "string") {
          return new Response(
            JSON.stringify({ error: "Email is required" }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ error: "Invalid email format" }),
            {
              status: 400,
              headers: {
                "content-type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        // Insert email into database
        const created_at = new Date().toISOString();
        const stmt = env.DB.prepare(
          "INSERT INTO emails (email, created_at) VALUES (?, ?)"
        );
        const result = await stmt.bind(email, created_at).run();

        // Return success response
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email saved successfully",
            data: {
              id: result.meta.last_row_id,
              email,
              created_at,
            },
          }),
          {
            status: 201,
            headers: {
              "content-type": "application/json",
              ...corsHeaders,
            },
          }
        );
      } catch (error) {
        console.error("Error inserting email:", error);
        
        // Check for duplicate email error
        if (error.message && error.message.includes("UNIQUE")) {
          return new Response(
            JSON.stringify({ error: "Email already exists" }),
            {
              status: 409,
              headers: {
                "content-type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // // Handle GET request to list emails
    // if (method === "GET" && url.pathname === "/api/emails") {
    //   try {
    //     const stmt = env.DB.prepare("SELECT * FROM emails ORDER BY created_at DESC LIMIT 10");
    //     const { results } = await stmt.all();

    //     return new Response(
    //       JSON.stringify({
    //         success: true,
    //         data: results,
    //       }),
    //       {
    //         headers: {
    //           "content-type": "application/json",
    //           ...corsHeaders,
    //         },
    //       }
    //     );
    //   } catch (error) {
    //     console.error("Error fetching emails:", error);
    //     return new Response(
    //       JSON.stringify({ error: "Internal server error" }),
    //       {
    //         status: 500,
    //         headers: {
    //           "content-type": "application/json",
    //           ...corsHeaders,
    //         },
    //       }
    //     );
    //   }
    // }

    // Default response for unsupported routes
    return new Response(
      JSON.stringify({
        error: "Not found",
        message: "Available endpoints: POST /api/email, GET /api/emails",
      }),
      {
        status: 404,
        headers: {
          "content-type": "application/json",
          ...corsHeaders,
        },
      }
    );
  },
} satisfies ExportedHandler<Env>;
