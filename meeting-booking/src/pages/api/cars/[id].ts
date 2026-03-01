import type { APIRoute } from "astro";
import { handleDelete, handleGet, handleUpdate } from "../../../lib/cars/controller";

export const prerender = false;

export const GET: APIRoute = async (ctx) => handleGet(ctx);
export const PUT: APIRoute = async (ctx) => handleUpdate(ctx);
export const DELETE: APIRoute = async (ctx) => handleDelete(ctx);
