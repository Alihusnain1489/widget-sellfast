import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { isActive, role, customRoleId, password, name, email, phone } = body;

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role) updateData.role = role;
    if (customRoleId !== undefined)
      updateData.customRoleId = customRoleId || null;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (password) {
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.default.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = getUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (id === currentUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            listings: true,
            contactForms: true,
            bids: true,
            deals: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete related data
    // Delete listings and their specifications
    if (user._count.listings > 0) {
      const listings = await prisma.listing.findMany({
        where: { userId: id },
        select: { id: true },
      });

      for (const listing of listings) {
        await prisma.listingSpecification.deleteMany({
          where: { listingId: listing.id },
        });
        await prisma.bid.deleteMany({
          where: { listingId: listing.id },
        });
      }

      await prisma.listing.deleteMany({
        where: { userId: id },
      });
    }

    // Delete contact forms
    if (user._count.contactForms > 0) {
      await prisma.contactForm.deleteMany({
        where: { userId: id },
      });
    }

    // Delete bids
    if (user._count.bids > 0) {
      await prisma.bid.deleteMany({
        where: { userId: id },
      });
    }

    // Delete deals
    if (user._count.deals > 0) {
      await prisma.deal.deleteMany({
        where: {
          OR: [{ buyerId: id }, { sellerId: id }],
        },
      });
    }

    // Delete OTPs
    await prisma.oTP.deleteMany({
      where: { userId: id },
    });

    // Delete password reset tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId: id },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
