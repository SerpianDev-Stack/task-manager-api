import express from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";


const prisma = new PrismaClient();
const app = express();

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173"];

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, success: boolean) => void) => {
    // Se a origem não for enviada (ex: ferramentas como Postman) OU se estiver na lista permitida
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Caso contrário, bloqueia
      callback(new Error("Origin not allowed by CORS"), false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.json());

app.post("/register", async (req, res) => {
  const { user_name, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    await prisma.user.create({
      data: {
        user_name,
        email,
        password,
      },
    });

    return res.status(201).json({
      message: "Usuário criado com sucesso!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});

// ------------------- LOGIN -------------------
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tasks: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // comparação simples
    if (user.password !== password) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

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

// ------------------- TASKS -------------------
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
      where: { user_id },
    });

    return res.status(200).json(tasks);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});

app.post("/tasks/:user_id", async (req, res) => {
  const user_id = Number(req.params.user_id);
  const { task_name } = req.body;

  try {
    const task = await prisma.task.create({
      data: {
        task_name,
        user_id,
      },
    });

    if (!task_name || typeof task_name !== "string") {
      return res.status(400).json({ message: "Nome da tarefa é obrigatório." });
    }

    return res
      .status(201)
      .json({ message: "Tarefa criada com sucesso!", task });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro interno no servidor" });
  }
});

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

app.patch("/tasks/:task_id", async (req, res) => {
  const task_id = Number(req.params.task_id);
  const { state } = req.body;

  try {
    if (state === undefined) {
      return res.status(400).json({
        message: "O campo 'state' é obrigatório (true ou false).",
      });
    }

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

const port = process.env.PORT || 8080; // Usa a porta do Railway, ou 3000 como fallback local

app.listen(port, () => {
  console.log(`Servidor iniciado na porta ${port}`);
});
