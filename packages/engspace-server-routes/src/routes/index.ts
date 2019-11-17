import { firstAdminRoutes } from './first_admin';
import { rootRoutes } from './root';
import { userRoutes } from './user';
import { projectRoutes } from './project';
import { buildRouter } from './routegen';

const router = buildRouter(rootRoutes);

router.use('/first_admin', buildRouter(firstAdminRoutes));
router.use('/users', buildRouter(userRoutes));
router.use('/projects', buildRouter(projectRoutes));

export default router;
