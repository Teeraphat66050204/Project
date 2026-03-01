import type { APIRoute } from "astro";
import { handleCreate, handleList } from "../../../lib/cars/controller";

export const prerender = false;

export const GET: APIRoute = async (ctx) => handleList(ctx);
export const POST: APIRoute = async (ctx) => handleCreate(ctx);
