import { Router } from "express";
import { CategoyController } from "./controller";
import { CategoryService } from "../services";
import { AuthMiddleware } from "../middlewares/auth.middlewares";

export class CategoryRoutes {
  static get routes(): Router {
    const router = Router();

    const categoryService = new CategoryService();
    const controller = new CategoyController(categoryService);

    router.get("/", controller.getCategories);
    router.post("/",[AuthMiddleware.validateJWT] ,controller.createCategory);

    return router;
  }
}
