import { NextResponse } from "next/server";
import { db } from "@/db";
import { rawMaterials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMaterialSchema, parseAndValidate } from "@/lib/validations";

// GET /api/materials — return all materials (exclude soft-deleted)
export async function GET() {
    try {
        const materials = await db
            .select()
            .from(rawMaterials)
            .where(eq(rawMaterials.isDeleted, false));

        return NextResponse.json(materials);
    } catch (error) {
        console.error("[GET /api/materials]", error);
        return NextResponse.json(
            { error: "Gagal mengambil data bahan baku" },
            { status: 500 }
        );
    }
}

// POST /api/materials — create a new material
export async function POST(req: Request) {
    const { data, error } = await parseAndValidate(req, createMaterialSchema);
    if (error) return error;

    try {
        const [created] = await db
            .insert(rawMaterials)
            .values({
                name: data.name,
                unit: data.unit,
                stock: data.stock,
                costPerUnit: data.costPerUnit,
            })
            .returning();

        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        console.error("[POST /api/materials]", err);
        return NextResponse.json(
            { error: "Gagal menyimpan bahan baku" },
            { status: 500 }
        );
    }
}

