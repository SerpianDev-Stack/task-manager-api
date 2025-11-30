import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";

// Inicializa o Prisma Client
const prisma = new PrismaClient();
const app = express();

// ---------------------- CORS CONFIG ----------------------
// Configura as origens permitidas (incluindo o front-end local)
const rawOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173"];

// Remove espaços e barras finais
const allowedOrigins = rawOrigins.map((o) => o.trim().replace(/\/$/, ""));

console.log("🌎 Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      console.log("❌ Origin bloqueado:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ---------------------- ROTA RAIZ (Health Check) ----------------------
// Esta rota garante que a Vercel responda com 200 OK quando o domínio base é acessado (/)
app.get("/", (req, res) => {
  res.status(200).json({
    status: "API OK",
    message: "Servidor Task Manager rodando.",
  });
});

// ---------------------- REGISTER ----------------------
app.post("/register", async (req, res) => {
  const { user_name, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email já cadastrado" });
    } // Em uma aplicação real, aqui você usaria o bcrypt para hashear a senha. // Por simplicidade, estamos usando a senha em texto puro (não recomendado em produção!).

    await prisma.user.create({
      data: { user_name, email, password },
    });

    return res.status(201).json({ message: "Usuário criado com sucesso!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// ---------------------- LOGIN ----------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tasks: true },
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    } // Remove a senha do objeto de resposta

    const safeUser = {
      id: user.id,
      user_name: user.user_name,
      email: user.email,
      created_in: user.created_in,
      tasks: user.tasks,
    };

    return res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// ---------------------- GET TASKS ----------------------
app.get("/tasks/:user_id", async (req, res) => {
  try {
    const user_id = Number(req.params.user_id);

    const userExists = await prisma.user.findUnique({
      where: { id: user_id },
    });

    if (!userExists) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const tasks = await prisma.task.findMany({
      where: { user_id }, // Sort tasks by id (or another field) in memory if needed,
      // as orderBy() in Firestore can cause indexing errors.
    });

    return res.status(200).json(tasks);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// ---------------------- CREATE TASK ----------------------
app.post("/tasks/:user_id", async (req, res) => {
  const user_id = Number(req.params.user_id);
  const { task_name } = req.body;

  if (!task_name || typeof task_name !== "string") {
    return res.status(400).json({ message: "Nome da tarefa é obrigatório." });
  }

  try {
    const task = await prisma.task.create({
      data: { task_name, user_id },
    });

    return res.status(201).json({
      message: "Tarefa criada com sucesso!",
      task,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// ---------------------- DELETE TASK ----------------------
app.delete("/tasks/:task_id", async (req, res) => {
  const task_id = Number(req.params.task_id);

  try {
    const taskExists = await prisma.task.findUnique({
      where: { id: task_id },
    });

    if (!taskExists) {
      return res.status(404).json({ error: "Tarefa não encontrada!" });
    }

    await prisma.task.delete({
      where: { id: task_id },
    });

    return res.json({ message: "Tarefa removida com sucesso!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ---------------------- UPDATE TASK STATE ----------------------
app.patch("/tasks/:task_id", async (req, res) => {
  const task_id = Number(req.params.task_id);
  const { state } = req.body;

  if (state === undefined) {
    return res
      .status(400)
      .json({ message: "O campo 'state' é obrigatório (true ou false)." });
  }

  try {
    const taskExists = await prisma.task.findUnique({
      where: { id: task_id },
    });

    if (!taskExists) {
      return res.status(404).json({ message: "Tarefa não encontrada!" });
    }

    const updatedTask = await prisma.task.update({
      where: { id: task_id },
      data: { state },
    });

    return res.status(200).json({
      message: "Estado da tarefa atualizado com sucesso!",
      task: updatedTask,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// ---------------------- EXPORTAÇÃO PARA VERCEL (MANDATÓRIO) ----------------------
// ESSA LINHA É USADA EM PRODUÇÃO PELA VERCEL
export default app;

// ---------------------- EXECUÇÃO LOCAL (OPCIONAL/DEV) ----------------------
// Esta lógica SÓ INICIA o servidor se não estiver no ambiente de produção.
// Use http://localhost:3000/ para testar no Thunder Client
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando localmente na porta ${PORT}`);
  });
}
