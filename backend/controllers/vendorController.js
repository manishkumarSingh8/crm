import prisma from "../config/prisma.js";

// POST /api/vendors
// Required permission: vendor.create
const createVendor = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Vendor name is required",
      });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email,
        phone,
        address,
      },
    });

    res.status(201).json({
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create vendor",
      error: error.message,
    });
  }
};

// PUT /api/vendors/:id
// Required permission: vendor.update
const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, status } = req.body;

    // 1. Handle invalid id safely
    const vendorId = Number(id);
    if (!Number.isInteger(vendorId)) {
      return res.status(400).json({
        message: "Invalid vendor id",
      });
    }

    // 2. Check that vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    // 3. Update only the provided vendor fields
    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (status !== undefined) data.status = status;

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data,
    });

    // 4. Return the updated vendor
    res.json({
      message: "Vendor updated successfully",
      vendor,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update vendor",
      error: error.message,
    });
  }
};

// DELETE /api/vendors/:id
// Required permission: vendor.delete
const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Handle invalid id safely
    const vendorId = Number(id);
    if (!Number.isInteger(vendorId)) {
      return res.status(400).json({
        message: "Invalid vendor id",
      });
    }

    // 2. Check that vendor exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!existingVendor) {
      return res.status(404).json({
        message: "Vendor not found",
      });
    }

    // 3. Delete the vendor
    await prisma.vendor.delete({
      where: { id: vendorId },
    });

    // 4. Return success response
    res.json({
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to delete vendor",
      error: error.message,
    });
  }
};

// GET /api/vendors
// Required permission: vendor.view
const getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { id: "asc" },
    });

    res.json({
      message: "Vendors list",
      vendors,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to get vendors",
      error: error.message,
    });
  }
};

export { createVendor, updateVendor, deleteVendor, getVendors };
