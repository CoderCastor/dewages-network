import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  upload,
  uploadProofPhotoHandler,
} from "../controller/uploadController.js";

const uploadRouter = express.Router();

// POST /v1/upload/proof-photo
// Authenticated worker uploads a proof photo; GPS coords sent as form fields
uploadRouter.post(
  "/proof-photo",
  authMiddleware,
  upload.single("file"),
  uploadProofPhotoHandler
);

export default uploadRouter;
