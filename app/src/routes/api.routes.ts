import express from 'express';

const router = express.Router();
const routes = [];

export const addApiRoute = (path: string, type: 'GET' | 'POST', middleware: any, route: any) => {
  const methodMap = {
    GET: router.get.bind(router),
    POST: router.post.bind(router),
    //put, delete
  };
  console.log('add api route:', `type=${type} path=api${path}`);
  routes.push({ path, type });
  // Pass middleware and route together; Express handles them as a sequence
  methodMap[type](path, middleware || [], route);
};

router.get('/', async (req, res) => {
  const html = routes.map((r) => `${r.type} /api${r.path}`).join('\n');
  res.status(200).send(html);
});

export default router;
