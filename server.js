// server.js
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const MONGO_URI = 'mongodb+srv://user:rGct7bIG6oojWW1q@consultorio.gtjgdhe.mongodb.net/?appName=Consultorio';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Servir pasta assets
const ASSETS_DIR = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}
if (!fs.existsSync(path.join(ASSETS_DIR, 'docs'))) {
  fs.mkdirSync(path.join(ASSETS_DIR, 'docs'), { recursive: true });
}
app.use('/assets', express.static(ASSETS_DIR));

let client;
let dbUsers, dbPacientes, dbAgendamentos, dbConsultas, dbRelatorios, dbFinanceiro, dbPedidos;

async function conectarDB() {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('✅ MongoDB conectado!');
  
  dbUsers = client.db('Users');
  dbPacientes = client.db('Pacientes');
  dbAgendamentos = client.db('Agendamentos');
  dbConsultas = client.db('Consultas');
  dbRelatorios = client.db('Relatorios');
  dbFinanceiro = client.db('Financeiro');
  dbPedidos = client.db('Pedidos');
}

// Configurar Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(ASSETS_DIR, 'docs'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// AUTH
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, nome, contacto, morada } = req.body;
    
    const existe = await dbUsers.collection('client').findOne({ 
      $or: [{ username }, { email }] 
    });
    if (existe) {
      return res.status(400).json({ error: 'Username ou email já existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      email,
      password: hashedPassword,
      nome,
      role: 'client',
      criadoEm: new Date()
    };
    
    const result = await dbUsers.collection('client').insertOne(newUser);
    
    await dbPacientes.collection('pacientes').insertOne({
      userId: result.insertedId,
      nome,
      email,
      contacto: contacto || '',
      morada: morada || '',
      idade: 0,
      estado: 'ativo',
      contextoFamiliar: {
        estadoCivil: '',
        filhos: 0,
        membros: []
      },
      criadoEm: new Date()
    });
    
    res.json({ message: 'Conta criada com sucesso!', userId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    
    const collection = isAdmin ? 'admin' : 'client';
    const user = await dbUsers.collection(collection).findOne({ username });
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    res.json({ 
      message: 'Login com sucesso!',
      user: { 
        id: user._id, 
        username: user.username, 
        nome: user.nome, 
        role: isAdmin ? 'admin' : 'client' 
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// CLIENTE - Perfil
app.get('/api/client/perfil/:userId', async (req, res) => {
  try {
    const user = await dbUsers.collection('client').findOne({ 
      _id: new ObjectId(req.params.userId) 
    });
    const paciente = await dbPacientes.collection('pacientes').findOne({ 
      userId: new ObjectId(req.params.userId) 
    });
    
    res.json({ user, paciente });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter perfil' });
  }
});

app.put('/api/client/perfil/:userId', async (req, res) => {
  try {
    const { email, password, nome, contacto, morada, idade, contextoFamiliar } = req.body;
    
    const updateUser = { email, nome };
    if (password) {
      updateUser.password = await bcrypt.hash(password, 10);
    }
    
    await dbUsers.collection('client').updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: updateUser }
    );
    
    await dbPacientes.collection('pacientes').updateOne(
      { userId: new ObjectId(req.params.userId) },
      { $set: { nome, contacto, morada, idade: parseInt(idade), contextoFamiliar } }
    );
    
    res.json({ message: 'Perfil atualizado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

app.delete('/api/client/perfil/:userId', async (req, res) => {
  try {
    await dbUsers.collection('client').deleteOne({ _id: new ObjectId(req.params.userId) });
    await dbPacientes.collection('pacientes').deleteOne({ userId: new ObjectId(req.params.userId) });
    res.json({ message: 'Conta apagada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar conta' });
  }
});

// AGENDAMENTOS
app.get('/api/agendamentos/disponiveis', async (req, res) => {
  try {
    const { data } = req.query;
    const ocupados = await dbConsultas.collection('horarios_ocupados').find({ data }).toArray();
    
    const horariosPossiveis = [];
    for (let h = 9; h <= 17; h++) {
      horariosPossiveis.push(`${h.toString().padStart(2, '0')}:00`);
    }
    
    const disponiveis = horariosPossiveis.filter(hora => 
      !ocupados.some(o => o.hora === hora)
    );
    
    res.json(disponiveis);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
  }
});

app.post('/api/agendamentos', async (req, res) => {
  try {
    const { paciente, data, hora } = req.body;
    
    const ocupado = await dbConsultas.collection('horarios_ocupados').findOne({ data, hora });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já ocupado' });
    }
    
    const agendamento = {
      paciente,
      psicologo: 'DraPsico',
      data,
      hora,
      estado: 'agendado',
      criadoEm: new Date()
    };
    
    const result = await dbAgendamentos.collection('agendamentos').insertOne(agendamento);
    
    await dbConsultas.collection('horarios_ocupados').insertOne({
      data,
      hora,
      duracao: 60,
      psicologo: 'DraPsico',
      ocupado: true,
      agendamentoId: result.insertedId
    });
    
    res.json({ message: 'Agendamento criado!', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

app.get('/api/agendamentos/cliente/:nome', async (req, res) => {
  try {
    const agendamentos = await dbAgendamentos.collection('agendamentos')
      .find({ paciente: req.params.nome })
      .sort({ data: -1 })
      .toArray();
    res.json(agendamentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

app.put('/api/agendamentos/:id', async (req, res) => {
  try {
    const { data, hora } = req.body;
    
    await dbConsultas.collection('horarios_ocupados').deleteOne({
      agendamentoId: new ObjectId(req.params.id)
    });
    
    const ocupado = await dbConsultas.collection('horarios_ocupados').findOne({ data, hora });
    if (ocupado) {
      return res.status(400).json({ error: 'Horário já ocupado' });
    }
    
    await dbAgendamentos.collection('agendamentos').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { data, hora } }
    );
    
    await dbConsultas.collection('horarios_ocupados').insertOne({
      data,
      hora,
      duracao: 60,
      psicologo: 'DraPsico',
      ocupado: true,
      agendamentoId: new ObjectId(req.params.id)
    });
    
    res.json({ message: 'Agendamento atualizado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// Cancelar agendamento com razão e notificação
app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    const { razao, canceladoPor } = req.body;
    
    if (!razao) {
      return res.status(400).json({ error: 'Razão de cancelamento obrigatória' });
    }

    const agendamento = await dbAgendamentos.collection('agendamentos')
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Apagar agendamento
    await dbAgendamentos.collection('agendamentos').deleteOne({ 
      _id: new ObjectId(req.params.id) 
    });
    await dbConsultas.collection('horarios_ocupados').deleteOne({
      agendamentoId: new ObjectId(req.params.id)
    });

    // Enviar mensagem de notificação
    const isAdmin = canceladoPor === 'DraPsico';
    const remetente = isAdmin ? 'DraPsico' : agendamento.paciente;
    const destinatario = isAdmin ? agendamento.paciente : 'DraPsico';

    await dbPedidos.collection('mensagens').insertOne({
      remetente,
      destinatario,
      assunto: `Cancelamento de Consulta - ${agendamento.data} ${agendamento.hora}`,
      texto: `A consulta marcada para ${agendamento.data} às ${agendamento.hora} foi cancelada.\n\nRazão: ${razao}`,
      tipo: isAdmin ? 'admin_para_cliente' : 'cliente_para_admin',
      criadoEm: new Date(),
      lida: false,
      isCancelamento: true
    });

    res.json({ message: 'Agendamento cancelado e notificação enviada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
});

// MENSAGENS
app.post('/api/mensagens', async (req, res) => {
  try {
    const { remetente, assunto, texto } = req.body;
    
    const mensagem = {
      remetente,
      destinatario: 'DraPsico',
      assunto,
      texto,
      tipo: 'cliente_para_admin',
      criadoEm: new Date(),
      lida: false
    };
    
    const result = await dbPedidos.collection('mensagens').insertOne(mensagem);
    res.json({ message: 'Mensagem enviada!', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

app.get('/api/mensagens/cliente/:nome', async (req, res) => {
  try {
    const enviadas = await dbPedidos.collection('mensagens')
      .find({ remetente: req.params.nome, tipo: 'cliente_para_admin' })
      .sort({ criadoEm: -1 })
      .toArray();
    
    const recebidas = await dbPedidos.collection('mensagens')
      .find({ destinatario: req.params.nome, tipo: 'admin_para_cliente' })
      .sort({ criadoEm: -1 })
      .toArray();
    
    res.json({ enviadas, recebidas });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

app.put('/api/mensagens/:id', async (req, res) => {
  try {
    const { assunto, texto } = req.body;
    await dbPedidos.collection('mensagens').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { assunto, texto, editadoEm: new Date() } }
    );
    res.json({ message: 'Mensagem editada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar mensagem' });
  }
});

app.delete('/api/mensagens/:id', async (req, res) => {
  try {
    await dbPedidos.collection('mensagens').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Mensagem apagada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar mensagem' });
  }
});

// ADMIN - Mensagens por cliente
app.get('/api/admin/mensagens/cliente/:nome', async (req, res) => {
  try {
    const mensagens = await dbPedidos.collection('mensagens')
      .find({
        $or: [
          { remetente: req.params.nome },
          { destinatario: req.params.nome }
        ]
      })
      .sort({ criadoEm: -1 })
      .toArray();
    
    res.json(mensagens);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

// ADMIN - Pacientes
app.get('/api/admin/pacientes', async (req, res) => {
  try {
    const pacientes = await dbPacientes.collection('pacientes').find().toArray();
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pacientes' });
  }
});

app.get('/api/admin/pacientes/:nome', async (req, res) => {
  try {
    const paciente = await dbPacientes.collection('pacientes').findOne({ nome: req.params.nome });
    const agendamentos = await dbAgendamentos.collection('agendamentos')
      .find({ paciente: req.params.nome })
      .toArray();
    
    res.json({ paciente, agendamentos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter detalhes' });
  }
});

// ADMIN - Mensagens
app.get('/api/admin/mensagens', async (req, res) => {
  try {
    const mensagens = await dbPedidos.collection('mensagens').find().sort({ criadoEm: -1 }).toArray();
    res.json(mensagens);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

app.post('/api/admin/mensagens/responder', async (req, res) => {
  try {
    const { destinatario, assunto, texto } = req.body;
    
    const mensagem = {
      remetente: 'DraPsico',
      destinatario,
      assunto,
      texto,
      tipo: 'admin_para_cliente',
      criadoEm: new Date(),
      lida: false
    };
    
    const result = await dbPedidos.collection('mensagens').insertOne(mensagem);
    res.json({ message: 'Resposta enviada!', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao responder' });
  }
});

// ADMIN - Relatórios com upload
app.post('/api/admin/relatorios', upload.array('anexos', 10), async (req, res) => {
  try {
    const { paciente, tipo, entidade, conteudo } = req.body;
    
    const anexos = req.files ? req.files.map(f => ({
      nome: f.originalname,
      caminho: `/assets/docs/${f.filename}`,
      tipo: f.mimetype,
      tamanho: f.size,
      uploadEm: new Date()
    })) : [];

    const relatorio = {
      paciente,
      tipo,
      entidade: entidade || 'Consultório',
      conteudo,
      anexos,
      data: new Date().toISOString().split('T')[0],
      estado: 'emitido',
      criadoEm: new Date()
    };
    
    const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
    const db = tipo === 'normal' ? dbConsultas : dbRelatorios;
    
    const result = await db.collection(collection).insertOne(relatorio);
    res.json({ message: 'Relatório criado!', id: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar relatório' });
  }
});

// Listar todos os relatórios
app.get('/api/admin/relatorios', async (req, res) => {
  try {
    const normais = await dbConsultas.collection('sessoes').find().sort({ data: -1 }).toArray();
    const externos = await dbRelatorios.collection('relatorios_externos').find().sort({ data: -1 }).toArray();
    
    res.json({ normais, externos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar relatórios' });
  }
});

// Editar relatório
app.put('/api/admin/relatorios/:id', async (req, res) => {
  try {
    const { tipo, conteudo, entidade } = req.body;
    
    const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
    const db = tipo === 'normal' ? dbConsultas : dbRelatorios;
    
    await db.collection(collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { conteudo, entidade, editadoEm: new Date() } }
    );
    
    res.json({ message: 'Relatório atualizado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar relatório' });
  }
});

// NOTIFICAÇÕES
app.get('/api/notificacoes/cliente/:nome', async (req, res) => {
  try {
    // Mensagens não lidas
    const mensagensNaoLidas = await dbPedidos.collection('mensagens').countDocuments({
      destinatario: req.params.nome,
      tipo: 'admin_para_cliente',
      lida: false
    });

    // Relatórios novos (últimos 7 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);
    
    const relatoriosNovos = await dbConsultas.collection('sessoes').countDocuments({
      paciente: req.params.nome,
      criadoEm: { $gte: dataLimite }
    }) + await dbRelatorios.collection('relatorios_externos').countDocuments({
      paciente: req.params.nome,
      criadoEm: { $gte: dataLimite }
    });

    // Pagamentos pendentes
    const pagamentosPendentes = await dbFinanceiro.collection('pagamentos').countDocuments({
      paciente: req.params.nome,
      estado: 'pendente'
    });

    res.json({
      mensagens: mensagensNaoLidas,
      relatorios: relatoriosNovos,
      pagamentos: pagamentosPendentes
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar notificações' });
  }
});

app.get('/api/notificacoes/admin', async (req, res) => {
  try {
    // Mensagens não lidas de clientes
    const mensagensNaoLidas = await dbPedidos.collection('mensagens').countDocuments({
      tipo: 'cliente_para_admin',
      lida: false
    });

    // Agendamentos hoje
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = await dbAgendamentos.collection('agendamentos').countDocuments({
      data: hoje,
      estado: 'agendado'
    });

    // Pagamentos pendentes
    const pagamentosPendentes = await dbFinanceiro.collection('pagamentos').countDocuments({
      estado: 'pendente'
    });

    res.json({
      mensagens: mensagensNaoLidas,
      agendamentos: agendamentosHoje,
      pagamentos: pagamentosPendentes
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar notificações' });
  }
});

// Marcar mensagem como lida
app.put('/api/mensagens/:id/marcar-lida', async (req, res) => {
  try {
    await dbPedidos.collection('mensagens').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { lida: true } }
    );
    res.json({ message: 'Mensagem marcada como lida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar mensagem' });
  }
});

// FINANCEIRO - Cliente
app.get('/api/client/financeiro/:nome', async (req, res) => {
  try {
    const pagamentos = await dbFinanceiro.collection('pagamentos')
      .find({ paciente: req.params.nome })
      .sort({ data: -1 })
      .toArray();
    
    res.json(pagamentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
});

// Apagar relatório
app.delete('/api/admin/relatorios/:id', async (req, res) => {
  try {
    const { tipo } = req.query;
    
    const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
    const db = tipo === 'normal' ? dbConsultas : dbRelatorios;
    
    await db.collection(collection).deleteOne({ _id: new ObjectId(req.params.id) });
    
    res.json({ message: 'Relatório apagado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar relatório' });
  }
});

app.get('/api/relatorios/paciente/:nome', async (req, res) => {
  try {
    const normais = await dbConsultas.collection('sessoes')
      .find({ paciente: req.params.nome })
      .toArray();
    
    const externos = await dbRelatorios.collection('relatorios_externos')
      .find({ paciente: req.params.nome })
      .toArray();
    
    res.json({ normais, externos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar relatórios' });
  }
});

// ADMIN - Financeiro com upload de comprovativos
app.post('/api/admin/pagamentos', upload.single('comprovativo'), async (req, res) => {
  try {
    const { paciente, valor, estado, metodo } = req.body;
    
    const comprovativo = req.file ? {
      nome: req.file.originalname,
      caminho: `/assets/docs/${req.file.filename}`,
      tipo: req.file.mimetype,
      tamanho: req.file.size,
      uploadEm: new Date()
    } : null;

    const pagamento = {
      paciente,
      valor: parseFloat(valor),
      estado,
      metodo,
      comprovativo,
      data: new Date().toISOString().split('T')[0],
      criadoEm: new Date()
    };
    
    const result = await dbFinanceiro.collection('pagamentos').insertOne(pagamento);
    res.json({ message: 'Pagamento registado!', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registar pagamento' });
  }
});

app.get('/api/admin/pagamentos', async (req, res) => {
  try {
    const pagamentos = await dbFinanceiro.collection('pagamentos').find().sort({ data: -1 }).toArray();
    res.json(pagamentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
  }
});

conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
  });
});