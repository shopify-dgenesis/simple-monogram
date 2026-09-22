import { config } from "dotenv";

config({ path: ".env.test" });

if (!process.env.DATABASE_URL?.includes("simple_monogram_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL does not point at the test database. " +
      "Check .env.test.",
  );
}
