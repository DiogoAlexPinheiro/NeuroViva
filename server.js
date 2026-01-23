// server.js - Servidor Completo com MongoDB Atlas
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const MONGO_URI = 'mongodb+srv://user:rGct7bIG6oojWW1q@consultorio.gtjgdhe.mongodb.net/?appName=Consultorio';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// CONFIGURACAO DA PASTA ASSETS
// ============================================
const ASSETS_DIR = path.join(__dirname, 'assets');
const requiredDirs = [
  ASSETS_DIR,
  path.join(ASSETS_DIR, 'docs'),
  path.join(ASSETS_DIR, 'images'),
  path.join(ASSETS_DIR, 'images', 'messages'),
  path.join(ASSETS_DIR, 'images', 'profiles')
];

requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Pasta criada: ' + dir);
  }
});

app.use('/assets', express.static(ASSETS_DIR));

const mailTransporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: 'werner.jenkins@ethereal.email',
    pass: 'j5Fq8XRttjTX3wBVa1'
  }
});

async function enviarRelatorioExternoEmail({
  to,
  entidade,
  paciente,
  titulo,
  codigo,
  conteudo
}) {
  const info = await mailTransporter.sendMail({
    from: '"Consultório NeuroViva" <werner.jenkins@ethereal.email>',
    to,
    subject: `Relatório Clínico – ${paciente}`,
    text: `
Foi criado um relatório clínico.

Paciente: ${paciente}
Entidade: ${entidade}
Código: ${codigo}

Conteúdo:
${conteudo}
    `,
    html: `
      <h2>Relatório Clínico</h2>
      <p><strong>Paciente:</strong> ${paciente}</p>
      <p><strong>Entidade:</strong> ${entidade}</p>
      <p><strong>Código:</strong> ${codigo}</p>
      <hr>
      <pre style="font-family:inherit;">${conteudo}</pre>
    `
  });

  console.log('📧 Email enviado!');
  console.log('🔗 Preview:', nodemailer.getTestMessageUrl(info));

  return info;
}

// ============================================
// CONEXAO MONGODB ATLAS
// ============================================
let client;
let dbUsers, dbPacientes, dbAgendamentos, dbConsultas, dbRelatorios, dbFinanceiro, dbPedidos;

async function conectarDB() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('MongoDB Atlas conectado!');
    
    dbUsers = client.db('Users');
    dbPacientes = client.db('Pacientes');
    dbAgendamentos = client.db('Agendamentos');
    dbConsultas = client.db('Consultas');
    dbRelatorios = client.db('Relatorios');
    dbFinanceiro = client.db('Financeiro');
    dbPedidos = client.db('Pedidos');
    
    await criarAdminPadrao();
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err);
  }
}

// ============================================
// FUNCOES AUXILIARES
// ============================================

function gerarCodigoUnico(tipo) {
  const prefixo = tipo === 'relatorio' ? 'REL' : 'PAG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefixo}-${timestamp}-${random}`;
}

function apagarImagemAntiga(imagePath) {
  if (!imagePath || imagePath.includes('default.jpg')) {
    return;
  }
  
  try {
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log('Imagem antiga apagada:', fullPath);
    }
  } catch (error) {
    console.error('Erro ao apagar imagem antiga:', error);
  }
}

async function criarAdminPadrao() {
  try {
    const adminExiste = await dbUsers.collection('admin').findOne({});
    
    if (!adminExiste) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await dbUsers.collection('admin').insertOne({
        username: 'admin',
        password: hashedPassword,
        nome: 'Administrador',
        primeiroNome: 'Admin',
        ultimoNome: '',
        email: 'admin@neuroviva.pt',
        genero: 'Feminino',
        profileImage: '/assets/images/profiles/default.jpg',
        horario: {
          segunda: ['09:00', '17:00'],
          terca: ['09:00', '17:00'],
          quarta: ['09:00', '17:00'],
          quinta: ['09:00', '17:00'],
          sexta: ['09:00', '17:00'],
          sabado: [],
          domingo: []
        },
        diasLivres: [],
        criadoEm: new Date()
      });
      
      console.log('Admin padrao criado - Username: admin, Password: admin123');
    }
  } catch (error) {
    console.error('Erro ao criar admin:', error);
  }
}

// ============================================
// CONFIGURACAO MULTER
// ============================================

const storageDoc = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(ASSETS_DIR, 'docs'));
  },
  filename: (req, file, cb) => {
    const codigo = req.codigoGerado || Date.now().toString();
    const ext = path.extname(file.originalname);
    const index = req.fileIndex || 0;
    req.fileIndex = (req.fileIndex || 0) + 1;
    const uniqueName = index === 0 ? `${codigo}${ext}` : `${codigo}-${index}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadDoc = multer({ 
  storage: storageDoc,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const storageMsg = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(ASSETS_DIR, 'images', 'messages'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const uploadMsg = multer({ 
  storage: storageMsg,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens sao permitidas'));
    }
  }
});

const storageProfile = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(ASSETS_DIR, 'images', 'profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const uploadProfile = multer({ 
  storage: storageProfile,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens sao permitidas'));
    }
  }
});

// ============================================
// ROTAS DE AUTENTICACAO
// ============================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, nome, primeiroNome, ultimoNome, contacto, morada, genero } = req.body;
    
    const existe = await dbUsers.collection('client').findOne({ 
      $or: [{ username }, { email }] 
    });
    if (existe) {
      return res.status(400).json({ error: 'Username ou email ja existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      email,
      password: hashedPassword,
      nome,
      primeiroNome: primeiroNome || '',
      ultimoNome: ultimoNome || '',
      genero: genero || '',
      profileImage: '/assets/images/profiles/default.jpg',
      role: 'client',
      criadoEm: new Date()
    };
    
    const result = await dbUsers.collection('client').insertOne(newUser);
    
    await dbPacientes.collection('pacientes').insertOne({
      userId: result.insertedId,
      nomeCompleto: nome,
      primeiroNome: primeiroNome || '',
      ultimoNome: ultimoNome || '',
      email,
      contacto: contacto || '',
      morada: morada || '',
      idade: 0,
      genero: genero || '',
      profissao: '',
      numeroIdentificacao: '',
      contatoEmergencia: { nome: '', telefone: '', relacao: '' },
      observacoesMedicas: '',
      profileImage: '/assets/images/profiles/default.jpg',
      estado: 'ativo',
      contextoFamiliar: { estadoCivil: '', filhos: 0, membros: [] },
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
    const { username, password } = req.body;

    let user = await dbUsers.collection('admin').findOne({ username });
    let currentRole = 'admin';

    if (!user) {
      user = await dbUsers.collection('client').findOne({ username });
      currentRole = 'client';
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }
    
    res.json({ 
      message: 'Login com sucesso!',
      user: { 
        id: user._id, 
        username: user.username, 
        nome: user.nome,
        primeiroNome: user.primeiroNome || '',
        genero: user.genero || '',
        profileImage: user.profileImage || '/assets/images/profiles/default.jpg',
        role: currentRole 
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// ============================================
// ROTAS DE PERFIL - CLIENTE
// ============================================

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

app.put('/api/client/perfil/:userId', uploadProfile.single('profileImage'), async (req, res) => {
  try {
    const { email, password, nome, primeiroNome, ultimoNome, contacto, morada, idade, genero, profissao, contextoFamiliar } = req.body;
    
    const userAntigo = await dbUsers.collection('client').findOne({ 
      _id: new ObjectId(req.params.userId) 
    });
    
    const updateUser = { 
      email, 
      nome, 
      primeiroNome: primeiroNome || '',
      ultimoNome: ultimoNome || '',
      genero: genero || ''
    };
    
    if (password) {
      updateUser.password = await bcrypt.hash(password, 10);
    }
    
    if (req.file) {
      if (userAntigo && userAntigo.profileImage) {
        apagarImagemAntiga(userAntigo.profileImage);
      }
      updateUser.profileImage = `/assets/images/profiles/${req.file.filename}`;
    }
    
    await dbUsers.collection('client').updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: updateUser }
    );
    
    const updatePaciente = { 
      nomeCompleto: nome,
      primeiroNome: primeiroNome || '',
      ultimoNome: ultimoNome || '',
      contacto, 
      morada, 
      idade: parseInt(idade) || 0, 
      genero: genero || '',
      profissao: profissao || '',
      contextoFamiliar: typeof contextoFamiliar === 'string' ? JSON.parse(contextoFamiliar) : contextoFamiliar
    };
    
    if (req.file) {
      updatePaciente.profileImage = `/assets/images/profiles/${req.file.filename}`;
    }
    
    await dbPacientes.collection('pacientes').updateOne(
      { userId: new ObjectId(req.params.userId) },
      { $set: updatePaciente }
    );
    
    res.json({ message: 'Perfil atualizado!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Rota para obter historico clinico do cliente (apenas leitura)
app.get('/api/client/historico/:userId', async (req, res) => {
  try {
    const paciente = await dbPacientes.collection('pacientes').findOne({ 
      userId: new ObjectId(req.params.userId) 
    });
    
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente nao encontrado' });
    }
    
    res.json({ historicClinico: paciente.historicClinico || null });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter historico clinico' });
  }
});

// ============================================
// ROTAS DE PERFIL - ADMIN
// ============================================

app.get('/api/admin/perfil', async (req, res) => {
  try {
    const { username } = req.query;
    const admin = await dbUsers.collection('admin').findOne({ username });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter perfil' });
  }
});

app.put('/api/admin/perfil', uploadProfile.single('profileImage'), async (req, res) => {
  try {
    const { username, nome, primeiroNome, ultimoNome, genero, email, password, horario, diasLivres } = req.body;
    
    const adminAntigo = await dbUsers.collection('admin').findOne({ username });
    
    const updateData = { 
      nome, 
      primeiroNome: primeiroNome || '',
      ultimoNome: ultimoNome || '',
      genero: genero || '',
      email,
      horario: typeof horario === 'string' ? JSON.parse(horario) : horario,
      diasLivres: typeof diasLivres === 'string' ? JSON.parse(diasLivres) : (diasLivres || [])
    };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    if (req.file) {
      if (adminAntigo && adminAntigo.profileImage) {
        apagarImagemAntiga(adminAntigo.profileImage);
      }
      updateData.profileImage = `/assets/images/profiles/${req.file.filename}`;
    }
    
    await dbUsers.collection('admin').updateOne(
      { username },
      { $set: updateData }
    );
    
    res.json({ message: 'Perfil atualizado!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// ============================================
// ROTAS DE PACIENTES - ADMIN
// ============================================

app.get('/api/admin/pacientes', async (req, res) => {
  try {
    const pacientes = await dbPacientes.collection('pacientes')
      .find()
      .sort({ estado: -1, nomeCompleto: 1 })
      .toArray();
    res.json(pacientes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pacientes' });
  }
});

app.get('/api/admin/pacientes/:nome', async (req, res) => {
  try {
    const paciente = await dbPacientes.collection('pacientes').findOne({ nomeCompleto: req.params.nome });
    const agendamentos = await dbAgendamentos.collection('agendamentos')
      .find({ paciente: req.params.nome })
      .sort({ data: -1 })
      .toArray();
    
    res.json({ paciente, agendamentos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter detalhes' });
  }
});

// ALTERAÇÃO 9: Rota para financeiro do paciente (admin)
app.get('/api/admin/pacientes/:nome/financeiro', async (req, res) => {
  try {
    const pagamentos = await dbFinanceiro.collection('pagamentos')
      .find({ paciente: req.params.nome })
      .sort({ data: -1 })
      .toArray();
    
    const totalPago = pagamentos.filter(p => p.estado === 'pago').reduce((sum, p) => sum + p.valor, 0);
    const totalPendente = pagamentos.filter(p => p.estado === 'pendente').reduce((sum, p) => sum + p.valor, 0);
    
    res.json({ 
      pagamentos, 
      resumo: { totalPago, totalPendente, total: totalPago + totalPendente }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar pagamentos do paciente' });
  }
});

app.post('/api/admin/pacientes', async (req, res) => {
  try {
    const { username, email, password, nomeCompleto, primeiroNome, ultimoNome, contacto, morada, idade, genero, profissao, numeroIdentificacao } = req.body;
    
    if (!nomeCompleto || !username || !email || !password) {
      return res.status(400).json({ error: 'Campos obrigatorios em falta' });
    }
    
    const existe = await dbUsers.collection('client').findOne({ 
      $or: [{ username }, { email }] 
    });
    if (existe) {
      return res.status(400).json({ error: 'Username ou email ja existe' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await dbUsers.collection('client').insertOne({
      username: username.trim(),
      email: email.trim(),
      password: hashedPassword,
      nome: nomeCompleto.trim(),
      primeiroNome: (primeiroNome || '').trim(),
      ultimoNome: (ultimoNome || '').trim(),
      genero: genero || '',
      profileImage: '/assets/images/profiles/default.jpg',
      role: 'client',
      criadoEm: new Date()
    });
    
    await dbPacientes.collection('pacientes').insertOne({
      userId: userResult.insertedId,
      nomeCompleto: nomeCompleto.trim(),
      primeiroNome: (primeiroNome || '').trim(),
      ultimoNome: (ultimoNome || '').trim(),
      email: email.trim(),
      contacto: contacto || '',
      morada: morada || '',
      idade: parseInt(idade) || 0,
      genero: genero || '',
      profissao: profissao || '',
      numeroIdentificacao: numeroIdentificacao || '',
      contatoEmergencia: { nome: '', telefone: '', relacao: '' },
      observacoesMedicas: '',
      profileImage: '/assets/images/profiles/default.jpg',
      estado: 'ativo',
      contextoFamiliar: { estadoCivil: '', filhos: 0, membros: [] },
      criadoEm: new Date()
    });
    
    res.json({ message: 'Paciente criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar paciente:', error);
    res.status(500).json({ error: 'Erro ao criar paciente' });
  }
});

app.put('/api/admin/pacientes/:id', uploadProfile.single('profileImage'), async (req, res) => {
  try {
    const { nomeCompleto, primeiroNome, ultimoNome, email, contacto, morada, idade, genero, profissao, numeroIdentificacao, observacoesMedicas, contextoFamiliar, estado } = req.body;
    
    if (!nomeCompleto || nomeCompleto.trim() === '') {
      return res.status(400).json({ error: 'Nome completo e obrigatorio' });
    }

    const pacienteAntigo = await dbPacientes.collection('pacientes').findOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    const updatePaciente = { 
      nomeCompleto: nomeCompleto.trim(),
      primeiroNome: (primeiroNome || '').trim(),
      ultimoNome: (ultimoNome || '').trim(),
      email: email.trim(),
      contacto: contacto || '',
      morada: morada || '',
      idade: parseInt(idade) || 0,
      genero: genero || '',
      profissao: profissao || '',
      numeroIdentificacao: numeroIdentificacao || '',
      observacoesMedicas: observacoesMedicas || '',
      contextoFamiliar: typeof contextoFamiliar === 'string' ? JSON.parse(contextoFamiliar) : (contextoFamiliar || { estadoCivil: '', filhos: 0, membros: [] }),
      estado: estado || 'ativo'
    };    
    
    if (req.file) {
      if (pacienteAntigo && pacienteAntigo.profileImage) {
        apagarImagemAntiga(pacienteAntigo.profileImage);
      }
      updatePaciente.profileImage = `/assets/images/profiles/${req.file.filename}`;
    }
    
    const result = await dbPacientes.collection('pacientes').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updatePaciente }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Paciente nao encontrado' });
    }
    
    const paciente = await dbPacientes.collection('pacientes').findOne({ _id: new ObjectId(req.params.id) });
    if (paciente && paciente.userId) {
      const updateUser = {
        nome: nomeCompleto.trim(),
        primeiroNome: (primeiroNome || '').trim(),
        ultimoNome: (ultimoNome || '').trim(),
        genero: genero || '',
        email: email.trim()
      };
      
      if (req.file) {
        updateUser.profileImage = `/assets/images/profiles/${req.file.filename}`;
      }
      
      await dbUsers.collection('client').updateOne(
        { _id: new ObjectId(paciente.userId) },
        { $set: updateUser }
      );
    }
    
    res.json({ message: 'Paciente atualizado!' });
  } catch (error) {
    console.error('Erro ao atualizar paciente:', error);
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// ALTERAÇÃO 5: Rota para histórico clínico
app.put('/api/admin/pacientes/:id/historico', async (req, res) => {
  try {
    const { historicClinico } = req.body;
    
    await dbPacientes.collection('pacientes').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { historicClinico } }
    );
    
    res.json({ message: 'Histórico clínico atualizado!' });
  } catch (error) {
    console.error('Erro ao atualizar histórico:', error);
    res.status(500).json({ error: 'Erro ao atualizar histórico clínico' });
  }
});

app.delete('/api/admin/pacientes/:id', async (req, res) => {
  try {
    const paciente = await dbPacientes.collection('pacientes').findOne({ _id: new ObjectId(req.params.id) });
    
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente nao encontrado' });
    }
    
    await dbPacientes.collection('pacientes').deleteOne({ _id: new ObjectId(req.params.id) });
    
    if (paciente.userId) {
      await dbUsers.collection('client').deleteOne({ _id: new ObjectId(paciente.userId) });
    }
    
    const agendamentos = await dbAgendamentos.collection('agendamentos')
      .find({ paciente: paciente.nomeCompleto })
      .toArray();
    
    for (const agendamento of agendamentos) {
      await dbConsultas.collection('horarios_ocupados').deleteOne({
        agendamentoId: agendamento._id
      });
    }
    
    await dbAgendamentos.collection('agendamentos').deleteMany({ 
      paciente: paciente.nomeCompleto 
    });
    
    await dbPedidos.collection('mensagens').deleteMany({
      $or: [
        { remetente: paciente.nomeCompleto },
        { destinatario: paciente.nomeCompleto }
      ]
    });
    
    await dbConsultas.collection('sessoes').deleteMany({ paciente: paciente.nomeCompleto });
    await dbRelatorios.collection('relatorios_externos').deleteMany({ paciente: paciente.nomeCompleto });
    await dbFinanceiro.collection('pagamentos').deleteMany({ paciente: paciente.nomeCompleto });
    
    res.json({ message: 'Paciente apagado com sucesso!' });
  } catch (error) {
    console.error('Erro ao apagar paciente:', error);
    res.status(500).json({ error: 'Erro ao apagar paciente' });
  }
});

// ============================================
// ROTAS DE AGENDAMENTOS
// ============================================

// ALTERAÇÃO 6: Rota para horário do admin (público para clientes)
app.get('/api/horario-atendimento', async (req, res) => {
  try {
    const admin = await dbUsers.collection('admin').findOne({});
    
    res.json({
      horario: admin.horario,
      diasLivres: admin.diasLivres || [],
      nomePsicologo: admin.nome
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter horário' });
  }
});

app.get('/api/agendamentos/disponiveis', async (req, res) => {
  try {
    const { data } = req.query;
    
    const admin = await dbUsers.collection('admin').findOne({});
    
    if (admin.diasLivres && admin.diasLivres.includes(data)) {
      return res.json([]);
    }
    
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = diasSemana[dataObj.getDay()];
    
    const horarioDia = admin.horario[diaSemana] || [];
    
    if (horarioDia.length === 0) {
      return res.json([]);
    }
    
    const [inicio, fim] = horarioDia;
    const horaInicio = parseInt(inicio.split(':')[0]);
    const horaFim = parseInt(fim.split(':')[0]);
    
    const horariosPossiveis = [];
    for (let h = horaInicio; h < horaFim; h++) {
      horariosPossiveis.push(`${h.toString().padStart(2, '0')}:00`);
      horariosPossiveis.push(`${h.toString().padStart(2, '0')}:30`);
    }
    
    const ocupados = await dbConsultas.collection('horarios_ocupados').find({ data }).toArray();
    
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
    const { paciente, data, hora, criadoPor } = req.body;
    
    const ocupado = await dbConsultas.collection('horarios_ocupados').findOne({ data, hora });
    if (ocupado) {
      return res.status(400).json({ error: 'Horario ja ocupado' });
    }
    
    const admin = await dbUsers.collection('admin').findOne({});
    
    const agendamento = {
      paciente,
      psicologo: admin.nome,
      data,
      hora,
      estado: criadoPor === 'admin' ? 'confirmado' : 'pendente',
      criadoPor: criadoPor || 'cliente',
      codigoRelatorio: null,
      codigoPagamento: null,
      criadoEm: new Date()
    };
    
    const result = await dbAgendamentos.collection('agendamentos').insertOne(agendamento);
    
    await dbConsultas.collection('horarios_ocupados').insertOne({
      data,
      hora,
      duracao: 60,
      psicologo: admin.nome,
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
      .toArray();
    
    agendamentos.sort((a, b) => {
      if (a.estado === 'pendente' && b.estado !== 'pendente') return -1;
      if (a.estado !== 'pendente' && b.estado === 'pendente') return 1;
      
      const dataA = new Date(a.data + 'T' + a.hora);
      const dataB = new Date(b.data + 'T' + b.hora);
      return dataA - dataB;
    });
    
    res.json(agendamentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

app.get('/api/admin/agendamentos', async (req, res) => {
  try {
    const agendamentos = await dbAgendamentos.collection('agendamentos')
      .find({})
      .toArray();
    
    agendamentos.sort((a, b) => {
      if (a.estado === 'pendente' && b.estado !== 'pendente') return -1;
      if (a.estado !== 'pendente' && b.estado === 'pendente') return 1;
      
      const dataA = new Date(a.data + 'T' + a.hora);
      const dataB = new Date(b.data + 'T' + b.hora);
      return dataA - dataB;
    });
    
    res.json(agendamentos);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

app.put('/api/agendamentos/:id', async (req, res) => {
  try {
    const { data, hora, estado } = req.body;
    
    const agendamento = await dbAgendamentos.collection('agendamentos')
      .findOne({ _id: new ObjectId(req.params.id) });
    
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }
    
    await dbConsultas.collection('horarios_ocupados').deleteOne({
      agendamentoId: new ObjectId(req.params.id)
    });
    
    if (data && hora) {
      const ocupado = await dbConsultas.collection('horarios_ocupados').findOne({ data, hora });
      if (ocupado) {
        return res.status(400).json({ error: 'Horario ja ocupado' });
      }
    }
    
    const updateData = {};
    if (data) updateData.data = data;
    if (hora) updateData.hora = hora;
    if (estado) updateData.estado = estado;
    
    if ((data || hora) && agendamento.estado === 'confirmado' && agendamento.criadoPor === 'cliente') {
      updateData.estado = 'pendente';
    }
    
    await dbAgendamentos.collection('agendamentos').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    
    if ((data || hora) && estado !== 'cancelado' && estado !== 'completo') {
      const admin = await dbUsers.collection('admin').findOne({});
      await dbConsultas.collection('horarios_ocupados').insertOne({
        data: data || agendamento.data,
        hora: hora || agendamento.hora,
        duracao: 60,
        psicologo: admin.nome,
        ocupado: true,
        agendamentoId: new ObjectId(req.params.id)
      });
    }
    
    res.json({ message: 'Agendamento atualizado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

app.delete('/api/agendamentos/:id', async (req, res) => {
  try {
    const { razao, canceladoPor } = req.body;
    
    if (!razao) {
      return res.status(400).json({ error: 'Razao de cancelamento obrigatoria' });
    }

    const agendamento = await dbAgendamentos.collection('agendamentos')
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }

    await dbAgendamentos.collection('agendamentos').deleteOne({ 
      _id: new ObjectId(req.params.id) 
    });
    
    await dbConsultas.collection('horarios_ocupados').deleteOne({
      agendamentoId: new ObjectId(req.params.id)
    });

    const admin = await dbUsers.collection('admin').findOne({});
    const isAdmin = canceladoPor === admin.nome;
    const remetente = isAdmin ? admin.nome : agendamento.paciente;
    const destinatario = isAdmin ? agendamento.paciente : admin.nome;

    await dbPedidos.collection('mensagens').insertOne({
      remetente,
      destinatario,
      assunto: `Cancelamento de Consulta - ${agendamento.data} ${agendamento.hora}`,
      texto: `A consulta marcada para ${agendamento.data} as ${agendamento.hora} foi cancelada.\n\nRazao: ${razao}`,
      imagem: null,
      tipo: isAdmin ? 'admin_para_cliente' : 'cliente_para_admin',
      criadoEm: new Date(),
      lida: false,
      isCancelamento: true
    });

    res.json({ message: 'Agendamento cancelado e notificacao enviada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar agendamento' });
  }
});

app.put('/api/agendamentos/:id/ligar-relatorio', async (req, res) => {
  try {
    const { codigoRelatorio } = req.body;
    
    let relatorio = await dbConsultas.collection('sessoes').findOne({ codigo: codigoRelatorio });
    if (!relatorio) {
      relatorio = await dbRelatorios.collection('relatorios_externos').findOne({ codigo: codigoRelatorio });
    }
    
    if (!relatorio) {
      return res.status(404).json({ error: 'Relatorio nao encontrado com este codigo' });
    }
    
    const agendamento = await dbAgendamentos.collection('agendamentos')
      .findOne({ _id: new ObjectId(req.params.id) });
    
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }
    
    await dbAgendamentos.collection('agendamentos').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { codigoRelatorio, estado: 'completo' } }
    );
    
    res.json({ message: 'Relatorio ligado ao agendamento com sucesso!' });
  } catch (error) {
    console.error('Erro ao ligar relatorio:', error);
    res.status(500).json({ error: 'Erro ao ligar relatorio' });
  }
});

app.put('/api/agendamentos/:id/ligar-pagamento', async (req, res) => {
  try {
    const { codigoPagamento } = req.body;
    
    const pagamento = await dbFinanceiro.collection('pagamentos').findOne({ codigo: codigoPagamento });
    
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento nao encontrado com este codigo' });
    }
    
    const agendamento = await dbAgendamentos.collection('agendamentos')
      .findOne({ _id: new ObjectId(req.params.id) });
    
    if (!agendamento) {
      return res.status(404).json({ error: 'Agendamento nao encontrado' });
    }
    
    await dbAgendamentos.collection('agendamentos').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { codigoPagamento } }
    );
    
    res.json({ message: 'Pagamento ligado ao agendamento com sucesso!' });
  } catch (error) {
    console.error('Erro ao ligar pagamento:', error);
    res.status(500).json({ error: 'Erro ao ligar pagamento' });
  }
});

// ============================================
// ROTAS DE MENSAGENS
// ============================================

app.post('/api/mensagens', uploadMsg.single('imagem'), async (req, res) => {
  try {
    const { remetente, destinatario, assunto, texto } = req.body;
    
    const admin = await dbUsers.collection('admin').findOne({});
    const destFinal = destinatario || admin.nome;
    
    const mensagem = {
      remetente,
      destinatario: destFinal,
      assunto,
      texto,
      imagem: req.file ? `/assets/images/messages/${req.file.filename}` : null,
      tipo: destFinal === admin.nome ? 'cliente_para_admin' : 'admin_para_cliente',
      criadoEm: new Date(),
      lida: false,
      isCancelamento: false
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

app.get('/api/admin/mensagens', async (req, res) => {
  try {
    const mensagens = await dbPedidos.collection('mensagens').find().sort({ criadoEm: -1 }).toArray();
    res.json(mensagens);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar mensagens' });
  }
});

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

app.post('/api/admin/mensagens/responder', uploadMsg.single('imagem'), async (req, res) => {
  try {
    const { destinatario, assunto, texto } = req.body;
    
    const admin = await dbUsers.collection('admin').findOne({});
    
    const mensagem = {
      remetente: admin.nome,
      destinatario,
      assunto,
      texto,
      imagem: req.file ? `/assets/images/messages/${req.file.filename}` : null,
      tipo: 'admin_para_cliente',
      criadoEm: new Date(),
      lida: false,
      isCancelamento: false
    };
    
    const result = await dbPedidos.collection('mensagens').insertOne(mensagem);
    res.json({ message: 'Resposta enviada!', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao responder' });
  }
});

app.post('/api/admin/mensagens/broadcast', uploadMsg.single('imagem'), async (req, res) => {
  try {
    const { assunto, texto } = req.body;
    
    const admin = await dbUsers.collection('admin').findOne({});
    const pacientes = await dbPacientes.collection('pacientes').find({ estado: 'ativo' }).toArray();
    
    const mensagens = pacientes.map(p => ({
      remetente: admin.nome,
      destinatario: p.nomeCompleto,
      assunto,
      texto,
      imagem: req.file ? `/assets/images/messages/${req.file.filename}` : null,
      tipo: 'admin_para_cliente',
      criadoEm: new Date(),
      lida: false,
      isCancelamento: false
    }));
    
    await dbPedidos.collection('mensagens').insertMany(mensagens);
    res.json({ message: `Mensagem enviada para ${mensagens.length} clientes!` });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar broadcast' });
  }
});

// ============================================
// ROTAS DE RELATORIOS
// ============================================

// ALTERAÇÃO 7: POST com campo entidadeEmail
app.post('/api/admin/relatorios',
  (req, res, next) => {
    req.codigoGerado = gerarCodigoUnico('relatorio');
    req.fileIndex = 0;
    next();
  },
  uploadDoc.array('anexos', 5),
  async (req, res) => {
    try {
      const { 
        titulo, 
        data, 
        paciente, 
        tipo, 
        entidade,
        entidadeEmail,
        conteudo, 
        notas,
        assinaturaNome,
        assinaturaTitulo
      } = req.body;

      const codigo = req.codigoGerado;

      const pacienteData = await dbPacientes
        .collection('pacientes')
        .findOne({ nomeCompleto: paciente });

      const admin = await dbUsers
        .collection('admin')
        .findOne({});

      const anexos = req.files ? req.files.map(f => ({
        nome: f.originalname,
        caminho: `/assets/docs/${f.filename}`,
        tipo: f.mimetype,
        tamanho: f.size,
        uploadEm: new Date()
      })) : [];

      const relatorio = {
        codigo,
        titulo: titulo || (tipo === 'normal' ? 'Relatorio de Sessao' : 'Relatorio Externo'),
        data: data || new Date().toISOString().split('T')[0],
        tipo,
        paciente,
        pacienteId: pacienteData?.numeroIdentificacao || '',
        pacienteContacto: pacienteData?.contacto || '',
        psicologo: admin?.nome || 'Psicologo',
        psicologoEmail: admin?.email || '',
        entidade: entidade || '',
        entidadeEmail: entidadeEmail || '',
        conteudo,
        notas: notas || '',
        anexos,
        assinatura: {
          nome: assinaturaNome || admin?.nome || '',
          titulo: assinaturaTitulo || ''
        },
        estado: 'emitido',
        criadoEm: new Date()
      };

      const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
      const db = tipo === 'normal' ? dbConsultas : dbRelatorios;

      const result = await db.collection(collection).insertOne(relatorio);

      // 📧 Enviar email APÓS guardar (não bloqueante)
      if (tipo !== 'normal' && entidadeEmail) {
        enviarRelatorioExternoEmail({
          to: entidadeEmail,
          entidade,
          paciente,
          titulo: relatorio.titulo,
          codigo,
          conteudo
        }).catch(err => {
          console.error('Erro ao enviar email do relatório:', err);
        });
      }

      res.json({
        message: 'Relatorio criado!',
        codigo,
        id: result.insertedId
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar relatorio' });
    }
  }
);

app.get('/api/admin/relatorios', async (req, res) => {
  try {
    const normais = await dbConsultas.collection('sessoes').find().sort({ data: -1 }).toArray();
    const externos = await dbRelatorios.collection('relatorios_externos').find().sort({ data: -1 }).toArray();
    
    res.json({ normais, externos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar relatorios' });
  }
});

app.get('/api/relatorios/codigo/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    let relatorio = await dbConsultas.collection('sessoes').findOne({ codigo });
    let tipo = 'normal';
    
    if (!relatorio) {
      relatorio = await dbRelatorios.collection('relatorios_externos').findOne({ codigo });
      tipo = 'externo';
    }
    
    if (!relatorio) {
      return res.status(404).json({ error: 'Relatorio nao encontrado' });
    }
    
    res.json({ relatorio, tipo });
  } catch (error) {
    console.error('Erro ao buscar relatorio:', error);
    res.status(500).json({ error: 'Erro ao buscar relatorio' });
  }
});

// ALTERAÇÃO 8: PUT com campo entidadeEmail
app.put('/api/admin/relatorios/:id', async (req, res) => {
  try {
    const { tipo, titulo, conteudo, entidade, entidadeEmail, notas } = req.body;
    
    const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
    const db = tipo === 'normal' ? dbConsultas : dbRelatorios;
    
    await db.collection(collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { 
        titulo,
        conteudo, 
        entidade,
        entidadeEmail: entidadeEmail || '',
        notas,
        editadoEm: new Date() 
      }}
    );
    
    res.json({ message: 'Relatorio atualizado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar relatorio' });
  }
});

app.delete('/api/admin/relatorios/:id', async (req, res) => {
  try {
    const { tipo } = req.query;
    
    const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
    const db = tipo === 'normal' ? dbConsultas : dbRelatorios;
    
    await db.collection(collection).deleteOne({ _id: new ObjectId(req.params.id) });
    
    res.json({ message: 'Relatorio apagado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar relatorio' });
  }
});

app.delete('/api/admin/relatorios/:id/anexo', async (req, res) => {
  try {
    const { tipo, anexoCaminho } = req.body;
    
    const collection = tipo === 'normal' ? 'sessoes' : 'relatorios_externos';
    const db = tipo === 'normal' ? dbConsultas : dbRelatorios;
    
    await db.collection(collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $pull: { anexos: { caminho: anexoCaminho } } }
    );
    
    try {
      const filePath = path.join(__dirname, anexoCaminho);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.error('Erro ao apagar ficheiro:', e);
    }
    
    res.json({ message: 'Anexo removido!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover anexo' });
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
    res.status(500).json({ error: 'Erro ao listar relatorios' });
  }
});

// ============================================
// ROTAS DE PAGAMENTOS
// ============================================

app.post('/api/admin/pagamentos', (req, res, next) => {
  req.codigoGerado = gerarCodigoUnico('pagamento');
  next();
}, uploadDoc.single('comprovativo'), async (req, res) => {
  try {
    const { paciente, valor, estado, metodo, data, descricao } = req.body;
    
    const codigo = req.codigoGerado;
    
    const comprovativo = req.file ? {
      nome: req.file.originalname,
      caminho: `/assets/docs/${req.file.filename}`,
      tipo: req.file.mimetype,
      tamanho: req.file.size,
      uploadEm: new Date()
    } : null;

    const pagamento = {
      codigo,
      paciente,
      valor: parseFloat(valor),
      estado,
      metodo,
      descricao: descricao || '',
      comprovativo,
      data: data || new Date().toISOString().split('T')[0],
      criadoEm: new Date()
    };
    
    const result = await dbFinanceiro.collection('pagamentos').insertOne(pagamento);
    res.json({ message: 'Pagamento registado!', codigo, id: result.insertedId });
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

app.get('/api/pagamentos/codigo/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const pagamento = await dbFinanceiro.collection('pagamentos').findOne({ codigo });
    
    if (!pagamento) {
      return res.status(404).json({ error: 'Pagamento nao encontrado' });
    }
    
    res.json(pagamento);
  } catch (error) {
    console.error('Erro ao buscar pagamento:', error);
    res.status(500).json({ error: 'Erro ao buscar pagamento' });
  }
});

app.put('/api/admin/pagamentos/:id', async (req, res) => {
  try {
    const { valor, estado, metodo, data, descricao } = req.body;
    
    await dbFinanceiro.collection('pagamentos').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { 
        valor: parseFloat(valor),
        estado,
        metodo,
        data,
        descricao: descricao || '',
        editadoEm: new Date()
      }}
    );
    
    res.json({ message: 'Pagamento atualizado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
});

app.delete('/api/admin/pagamentos/:id', async (req, res) => {
  try {
    await dbFinanceiro.collection('pagamentos').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Pagamento apagado!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar pagamento' });
  }
});

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

// ============================================
// ROTAS DE ESTATISTICAS E NOTIFICACOES
// ============================================

app.get('/api/admin/estatisticas', async (req, res) => {
  try {
    const totalPacientes = await dbPacientes.collection('pacientes').countDocuments({ estado: 'ativo' });
    const sessoesCompletas = await dbAgendamentos.collection('agendamentos').countDocuments({ estado: 'completo' });
    
    const admin = await dbUsers.collection('admin').findOne({});
    
    const hoje = new Date().toISOString().split('T')[0];
    const daquiUmaSemana = new Date();
    daquiUmaSemana.setDate(daquiUmaSemana.getDate() + 7);
    const dataLimite = daquiUmaSemana.toISOString().split('T')[0];
    
    const proximosAgendamentos = await dbAgendamentos.collection('agendamentos')
      .find({
        data: { $gte: hoje, $lte: dataLimite },
        estado: { $in: ['confirmado', 'pendente'] }
      })
      .sort({ data: 1, hora: 1 })
      .limit(5)
      .toArray();
    
    const agendamentosParaAtualizar = await dbAgendamentos.collection('agendamentos')
      .find({
        data: { $lte: hoje },
        estado: { $in: ['confirmado', 'pendente'] }
      })
      .sort({ data: 1, hora: 1 })
      .toArray();
    
    res.json({
      totalPacientes,
      sessoesCompletas,
      horario: admin.horario,
      proximosAgendamentos,
      agendamentosParaAtualizar
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar estatisticas' });
  }
});

app.get('/api/estatisticas/publico', async (req, res) => {
  try {
    const totalClientes = await dbPacientes.collection('pacientes').countDocuments({ estado: 'ativo' });
    const sessoesCompletas = await dbAgendamentos.collection('agendamentos').countDocuments({ estado: 'completo' });
    
    res.json({
      totalClientes,
      sessoesCompletas
    });
  } catch (error) {
    console.error('Erro ao carregar estatisticas publicas:', error);
    res.status(500).json({ error: 'Erro ao carregar estatisticas' });
  }
});

app.get('/api/notificacoes/cliente/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    
    const mensagens = await dbPedidos.collection('mensagens').countDocuments({ 
      destinatario: nome, 
      tipo: 'admin_para_cliente',
      lida: false 
    });
    
    const pagamentos = await dbFinanceiro.collection('pagamentos').countDocuments({ 
      paciente: nome, 
      estado: 'pendente' 
    });
    
    res.json({ mensagens, pagamentos });
  } catch (error) {
    console.error('Erro ao obter notificacoes:', error);
    res.status(500).json({ error: 'Erro ao obter notificacoes' });
  }
});

app.get('/api/notificacoes/admin', async (req, res) => {
  try {
    const mensagens = await dbPedidos.collection('mensagens').countDocuments({ 
      destinatario: 'Admin',
      tipo: 'cliente_para_admin',
      lida: false 
    });
    
    const pagamentos = await dbFinanceiro.collection('pagamentos').countDocuments({ 
      estado: 'pendente' 
    });
    
    res.json({ mensagens, pagamentos });
  } catch (error) {
    console.error('Erro ao obter notificacoes:', error);
    res.status(500).json({ error: 'Erro ao obter notificacoes' });
  }
});

function gerarHTMLPagamento(dados) {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Pagamento ${dados.codigo} - ${dados.paciente}</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 40px;
          color: #1f2933;
          font-size: 14px;
        }

        h1 {
          color: #2563eb;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .label {
          font-weight: bold;
          color: #374151;
        }

        .valor {
          margin-top: 30px;
          padding: 15px;
          background: #f1f5f9;
          border-left: 5px solid #16a34a;
          font-size: 18px;
          font-weight: bold;
        }

        footer {
          margin-top: 50px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>

      <h1>Comprovativo de Pagamento</h1>

      <div class="row"><span class="label">Código:</span><span>${dados.codigo}</span></div>
      <div class="row"><span class="label">Paciente:</span><span>${dados.paciente}</span></div>
      <div class="row"><span class="label">Data:</span><span>${dados.data}</span></div>
      <div class="row"><span class="label">Método:</span><span>${dados.metodo}</span></div>
      <div class="row"><span class="label">Estado:</span><span>${dados.estado}</span></div>

      ${dados.descricao ? `
        <div class="row"><span class="label">Descrição:</span><span>${dados.descricao}</span></div>
      ` : ''}

      <div class="valor">
        Valor: € ${Number(dados.valor).toFixed(2)}
      </div>

      <footer>
        © ${new Date().getFullYear()} NeuroViva · Documento gerado automaticamente
      </footer>

    </body>
    </html>
  `;
}

function gerarHTMLRelatorio(dados) {
  return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="UTF-8">
      <title>Relatório ${dados.codigo} - ${dados.paciente}</title>
      <style>
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 40px;
          color: #1f2933;
          font-size: 14px;
          line-height: 1.6;
        }

        h1 {
          color: #2563eb;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }

        h2 {
          margin-top: 30px;
          color: #1e3a8a;
        }

        .row {
          margin-bottom: 8px;
        }

        .label {
          font-weight: bold;
          color: #374151;
        }

        .box {
          margin-top: 15px;
          padding: 15px;
          background: #f8fafc;
          border-left: 4px solid #2563eb;
          white-space: pre-wrap;
        }

        footer {
          margin-top: 50px;
          text-align: right;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>

      <h1>Relatório Clínico</h1>

      <div class="row"><span class="label">Código:</span> ${dados.codigo}</div>
      <div class="row"><span class="label">Data:</span> ${dados.data}</div>
      <div class="row"><span class="label">Paciente:</span> ${dados.paciente}</div>
      <div class="row"><span class="label">Psicóloga:</span> ${dados.psicologo || '—'}</div>

      ${dados.entidade ? `
        <div class="row"><span class="label">Entidade:</span> ${dados.entidade}</div>
      ` : ''}

      ${dados.titulo ? `<h2>${dados.titulo}</h2>` : ''}

      <div class="box">${dados.conteudo || ''}</div>

      ${dados.notas ? `
        <h2>Notas</h2>
        <div class="box">${dados.notas}</div>
      ` : ''}

      ${dados.assinatura ? `
        <footer>
          <strong>${dados.assinatura.nome}</strong><br>
          ${dados.assinatura.titulo || ''}
        </footer>
      ` : `
        <footer>
          Documento clínico emitido por NeuroViva
        </footer>
      `}

    </body>
    </html>
  `;
}

app.post('/api/pdf/detalhes', async (req, res) => {
  const { tipo, dados } = req.body;

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: puppeteer.executablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    let html = '';

    if (tipo === 'pagamento') {
      html = gerarHTMLPagamento(dados);
    } else if (tipo === 'relatorio') {
      html = gerarHTMLRelatorio(dados);
    } else {
      throw new Error('Tipo de PDF inválido');
    }

    await page.setContent(html, { waitUntil: 'load' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="detalhes.pdf"',
      'Content-Length': pdf.length
    });

    res.end(pdf);

  } catch (err) {
    console.error('Erro ao gerar PDF:', err);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

// ============================================
// INICIALIZACAO
// ============================================

conectarDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
    console.log(`Ficheiros estaticos servidos de: public/`);
    console.log(`Assets guardados em: assets/`);
  });
});