const express = require('express');
const app = express();
const port = 3000; //porta padrão
const mysql = require('mysql2');

app.use(express.json());
app.get('/', (req, res) => res.json({ message: 'Funcionando!' }));



function execSQLQuery(sqlQry, id, res) {
  const connection = mysql.createConnection({
    host: '18.214.104.16',
    port: 3306,
    user: '20193026222',
    password: '20193026222',
    database: '20193026222'
  });

  connection.query(sqlQry, id, (error, results, fields) => {
    console.log(id);
    if (error)
      res.json(error);
    else
      res.json(results);
    connection.end();
    console.log('executou!');
  });
}

// Endpoint para registrar um novo usuário
app.post('/registrar', async (req, res) => {
  const { usuario, nome, email, telefone, senha } = req.body;

  // Verifica se o usuário já existe
  const user = await query(`SELECT * FROM usuario WHERE USU_usuario = '${usuario}'`);
  if (user.length > 0) {
    return res.status(400).json({ message: 'Usuário já existe' });
  }

  // Criptografa a senha
  const hashedPassword = await bcrypt.hash(senha, 10);

  // Insere o usuário no banco de dados
  await query(`INSERT INTO usuario (USU_usuario, USU_nome, USU_email, USU_telefone, USU_senha, USU_lvlAcesso) 
              VALUES ('${usuario}', '${nome}', '${email}', '${telefone}', '${hashedPassword}', 1)`);

  res.json({ message: 'Usuário registrado com sucesso' });
});

// Endpoint para autenticar um usuário e retornar um token JWT
app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  // Verifica se o usuário existe
  const user = await query(`SELECT * FROM usuario WHERE USU_usuario = '${usuario}'`);
  if (user.length === 0) {
    return res.status(400).json({ message: 'Usuário não encontrado' });
  }

  // Verifica se a senha está correta
  const isPasswordCorrect = await bcrypt.compare(senha, user[0].USU_senha);
  if (!isPasswordCorrect) {
    return res.status(400).json({ message: 'Senha incorreta' });
  }

  // Gera um token JWT
  const token = jwt.sign({ id: user[0].USU_ID }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});

// Middleware para verificar se o usuário está autenticado
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
}

// Endpoint para retornar todas as vendas
app.get('/vendas', verifyToken, async (req, res) => {
  const vendas = await query('SELECT * FROM CM_vendas');
  res.json(vendas);
});

// Endpoint para criar uma nova venda
app.post('/vendas', verifyToken, async (req, res) => {
  const { vendedorID, quant, dataVenda, horaVenda, tipoPag, valorTotal } = req.body;

  // Verifica se o vendedor existe
  const vendedor = await query('SELECT * FROM CM_usuario WHERE USU_ID = ${vendedorID} AND USU_lvlAcesso = 2');
  if (vendedor.length === 0) {
    return res.status(400).json({ message: 'Vendedor não encontrado' });
  }

  // Insere a venda no banco de dados
  const result = await query('INSERT INTO CM_vendas (VEN_vendedorID, VEN_quant, VEN_dataVenda, VEN_horaVenda, VEN_tipoPag, VEN_valorTotal) VALUES (${vendedorID}, ${quant}, ${dataVenda}, ${horaVenda}, ${tipoPag}, ${valorTotal})');

  res.json({ message: 'Venda criada com sucesso', id: result.insertId });
});

// Endpoint para retornar todas as vendas dentro de um período de tempo
app.get('/vendas/:data/:horaini/:horafim', verifyToken, async (req, res) => {
  const { data, horaini, horafim } = req.params;

  // Verifica se a data e hora são válidas
  if (!isValidDate(data) || !isValidTime(horaini) || !isValidTime(horafim)) {
    return res.status(400).json({ message: 'Data ou hora inválidas' });
  }

  // Busca as vendas dentro do período especificado
  const vendas = await query("SELECT * FROM CM_vendas WHERE VEN_dataVenda = '${data}' AND VEN_horaVenda >= '${horaini}:00' AND VEN_horaVenda <= '${horafim}:59'");
  res.json(vendas);
});

// Função para validar se a data é válida
function isValidDate(dateString) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) {
    return false; // formato inválido
  }
  const d = new Date(dateString);
  const dNum = d.getTime();
  if (!dNum && dNum !== 0) {
    return false; // valor NaN, data inválida
  }
  return d.toISOString().slice(0, 10) === dateString;
}

// Função para validar se a hora é válida
function isValidTime(timeString) {
  const regEx = /^([01]\d|2[0-3]):[0-5]\d$/;
  return timeString.match(regEx);
}

// Endpoint para retornar uma venda específica
app.get('/vendas/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  // Busca a venda pelo ID
  const venda = await query(`SELECT * FROM CM_vendas WHERE VEN_ID = ${id}`);

  // Verifica se a venda existe
  if (venda.length === 0) {
    return res.status(404).json({ message: 'Venda não encontrada' });
  }

  res.json(venda[0]);
});

// Endpoint para atualizar uma venda existente
app.put('/vendas/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { VEN_vendedorID, VEN_quant, VEN_dataVenda, VEN_horaVenda, VEN_tipoPag, VEN_valorTotal } = req.body;

  // Verifica se a venda existe
  const vendaExistente = await query(`SELECT * FROM CM_vendas WHERE VEN_ID = ${id}`);
  if (vendaExistente.length === 0) {
    return res.status(404).json({ message: 'Venda não encontrada' });
  }

  // Atualiza a venda
  await query(`UPDATE CM_vendas SET VEN_vendedorID = ${VEN_vendedorID}, VEN_quant = ${VEN_quant}, VEN_dataVenda = '${VEN_dataVenda}', VEN_horaVenda = '${VEN_horaVenda}', VEN_tipoPag = '${VEN_tipoPag}', VEN_valorTotal = ${VEN_valorTotal} WHERE VEN_ID = ${id}`);

  // Busca a venda atualizada
  const vendaAtualizada = await query(`SELECT * FROM CM_vendas WHERE VEN_ID = ${id}`);

  res.json(vendaAtualizada[0]);
});

// Endpoint para excluir uma venda existente
app.delete('/vendas/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  // Verifica se a venda existe
  const vendaExistente = await query(`SELECT * FROM CM_vendas WHERE VEN_ID = ${id}`);
  if (vendaExistente.length === 0) {
    return res.status(404).json({ message: 'Venda não encontrada' });
  }

  // Exclui a venda
  await query(`DELETE FROM CM_vendas WHERE VEN_ID = ${id}`);

  res.json({ message: 'Venda excluída com sucesso' });
});

//inicia o servidor
app.listen(port);
console.log('API funcionando!');


