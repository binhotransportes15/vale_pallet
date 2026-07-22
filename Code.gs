/**
 * Vale Pallet — BINHO Transportes
 *
 * IMPORTANTE: o Apps Script em modo App da Web muitas vezes NÃO encontra a planilha
 * com getActiveSpreadsheet(). Por isso é obrigatório colar o ID abaixo.
 *
 * Como pegar o ID:
 * Abra a planilha no navegador. A URL é assim:
 * https://docs.google.com/spreadsheets/d/COLE_ESTE_PEDACO_AQUI/edit
 *
 * Passos:
 * 1. Cole o ID em SPREADSHEET_ID (abaixo)
 * 2. Salvar
 * 3. Implantar → Gerenciar implantações → lápis → Nova versão → Implantar
 */

// >>> ID da planilha BINHO (já configurado) <<<
var SPREADSHEET_ID = "1e6sl9jM7k8706W35EpkyzrQqEqxklGl5e3qAr7r0ECc";

var ABA_VALES = "Vales";
var ABA_CLIENTES = "Clientes";
var ABA_MOTORISTAS = "Motoristas";
var ABA_CONFERENTES = "Conferentes";
var ABA_CONFIG = "Config";
var ABA_FILIAIS = "Filiais";
var NUMERO_INICIAL = 1;
var PRECO_PADRAO = 10;
/** Filiais oficiais (usuário = nome da filial). Senha só no 1º acesso. */
var FILIAIS_PADRAO = [
  "ALTAMIRA",
  "GOIANIA",
  "RIO DE JANEIRO",
  "SERRA",
  "BRASILIA",
  "GUARULHOS",
];

function doGet(e) {
  return rotear_(extrairDados_(e));
}

function doPost(e) {
  return rotear_(extrairDados_(e));
}

/** Lê parâmetros da URL, form ou JSON do body (incluindo redirect do Google). */
function extrairDados_(e) {
  var dados = {};

  try {
    if (e && e.parameter) {
      for (var k in e.parameter) {
        if (Object.prototype.hasOwnProperty.call(e.parameter, k)) {
          dados[k] = e.parameter[k];
        }
      }
    }

    // JSON enviado como ?payload={...} ou no body
    if (dados.payload) {
      var parsedPayload = JSON.parse(dados.payload);
      for (var pk in parsedPayload) {
        if (Object.prototype.hasOwnProperty.call(parsedPayload, pk)) {
          dados[pk] = parsedPayload[pk];
        }
      }
      delete dados.payload;
    }

    if (e && e.postData && e.postData.contents) {
      var raw = String(e.postData.contents).trim();
      if (raw.charAt(0) === "{") {
        var parsedBody = JSON.parse(raw);
        for (var bk in parsedBody) {
          if (Object.prototype.hasOwnProperty.call(parsedBody, bk)) {
            dados[bk] = parsedBody[bk];
          }
        }
      }
    }
  } catch (err) {
    return { action: "__erro_parse__", erro: String(err.message || err) };
  }

  return dados;
}

function rotear_(dados) {
  try {
    if (dados && dados.action === "__erro_parse__") {
      return json_({ ok: false, erro: "Dados inválidos: " + (dados.erro || "") });
    }

    garantirEstrutura_();
    var action = String((dados && dados.action) || "proximo").trim();

    if (action === "ping" || action === "teste") {
      var ss = obterPlanilha_();
      return json_({
        ok: true,
        mensagem: "Planilha conectada com sucesso.",
        planilha: ss.getName(),
        id: ss.getId(),
        precoUnitario: pegarPrecoUnitario_(dados.filial),
        filial: normalizarFilial_(dados.filial || ""),
        proximo: pegarProximoNumero_(),
        marca: pegarMarca_(),
      });
    }

    if (action === "proximo") {
      return json_({
        ok: true,
        numero: pegarProximoNumero_(),
        precoUnitario: pegarPrecoUnitario_(dados.filial),
        filial: normalizarFilial_(dados.filial || ""),
      });
    }

    if (action === "config") {
      return json_({
        ok: true,
        precoUnitario: pegarPrecoUnitario_(dados.filial),
        filial: normalizarFilial_(dados.filial || ""),
        proximo: pegarProximoNumero_(),
        marca: pegarMarca_(),
      });
    }

    if (action === "emitir") {
      return emitir_(dados);
    }

    if (action === "listar_vales") {
      return listarVales_(dados);
    }

    if (action === "buscar_vale") {
      return buscarVale_(dados.numero, dados.filial);
    }

    if (action === "apagar_vale") {
      return apagarVale_(dados);
    }

    if (action === "baixar_vale") {
      return baixarVale_(dados);
    }

    if (action === "listar_filiais") {
      return listarFiliais_();
    }

    if (action === "login") {
      return loginFilial_(dados);
    }

    if (action === "listar_clientes") {
      return listarClientes_(dados.q || "");
    }

    if (action === "salvar_cliente") {
      return salvarCliente_(dados);
    }

    if (action === "listar_motoristas") {
      return listarMotoristas_(dados.q || "");
    }

    if (action === "salvar_motorista") {
      return salvarMotorista_(dados);
    }

    if (action === "listar_conferentes") {
      return listarConferentes_(dados.q || "", dados.tipo || "");
    }

    if (action === "salvar_conferente") {
      return salvarConferente_(dados);
    }

    if (action === "definir_preco") {
      // Aceita precoUnitario ou preco_unitario (query string)
      var precoNovo =
        dados.precoUnitario != null && dados.precoUnitario !== ""
          ? dados.precoUnitario
          : dados.preco_unitario;
      return definirPreco_(precoNovo, dados);
    }

    if (action === "definir_marca") {
      return definirMarca_(dados);
    }

    if (action === "salvar_logo") {
      return salvarLogo_(dados);
    }

    if (action === "logo_reset") {
      return logoReset_();
    }

    if (action === "logo_chunk") {
      return logoChunk_(dados);
    }

    if (action === "logo_commit") {
      return logoCommit_();
    }

    return json_({
      ok: false,
      erro:
        "Ação inválida: \"" +
        action +
        "\". Atualize o Code.gs e publique uma Nova versão na implantação.",
    });
  } catch (err) {
    return json_({ ok: false, erro: String(err.message || err) });
  }
}

/* ===================== EMITIR ===================== */

function emitir_(dados) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = obterAbaVales_();
    var numero = pegarProximoNumero_(sheet);
    var qtd = Number(String(dados.quantidade || "0").replace(",", "."));
    var filial = exigirFilialLogada_(dados.filial, dados.senhaFilial || dados.senha_filial);
    if (filial.erro) {
      return json_({ ok: false, erro: filial.erro });
    }

    var preco = pegarPrecoUnitario_(filial.nome);
    var valorCalc = !isNaN(qtd) && qtd > 0 ? qtd * preco : 0;
    var valorTexto =
      dados.valor && String(dados.valor).trim()
        ? String(dados.valor).trim()
        : formatarMoeda_(valorCalc);

    var nome = String(dados.nome || "").trim();
    if (!nome) {
      return json_({ ok: false, erro: "Nome do cliente é obrigatório." });
    }

    var motorista = String(dados.motorista || "").trim();
    var placa = normalizarPlaca_(dados.placa);
    if (!motorista) {
      return json_({ ok: false, erro: "Nome do motorista é obrigatório." });
    }
    if (!placa) {
      return json_({ ok: false, erro: "Placa do veículo é obrigatória." });
    }

    var conferenteExpedidor = String(
      dados.conferenteExpedidor || dados.conferente || ""
    ).trim();
    var conferenteRecebedor = String(dados.conferenteRecebedor || "").trim();
    if (!conferenteExpedidor) {
      return json_({
        ok: false,
        erro: "Conferente expedidor é obrigatório.",
      });
    }
    if (!conferenteRecebedor) {
      return json_({
        ok: false,
        erro: "Conferente recebedor é obrigatório.",
      });
    }

    var agora = Utilities.formatDate(
      new Date(),
      "America/Sao_Paulo",
      "dd/MM/yyyy HH:mm:ss"
    );

    sheet.appendRow([
      numero,
      dados.quantidade || "",
      valorTexto,
      nome,
      dados.dia || "",
      dados.mes || "",
      dados.ano || "",
      agora,
      motorista,
      placa,
      "EM ABERTO",
      "",
      conferenteExpedidor,
      conferenteRecebedor,
      filial.nome,
    ]);

    // Garante o cliente no banco de clientes
    garantirCliente_(nome);
    // Garante a combinação motorista + placa no banco de motoristas
    garantirMotorista_(motorista, placa);
    garantirConferente_(conferenteExpedidor, "EXPEDIDOR");
    garantirConferente_(conferenteRecebedor, "RECEBEDOR");

    return json_({
      ok: true,
      numero: numero,
      proximo: numero + 1,
      valor: valorTexto,
      precoUnitario: preco,
      filial: filial.nome,
      mensagem: "Vale Nº " + numero + " salvo (" + filial.nome + ").",
    });
  } finally {
    lock.releaseLock();
  }
}

/* ===================== CONSULTA VALES ===================== */

function listarVales_(dados) {
  var sheet = obterAbaVales_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) {
    return json_({ ok: true, vales: [], filialLogada: normalizarFilial_(dados.filial || "") });
  }

  var rows = sheet.getRange(2, 1, ultima, 15).getValues();
  var filtro = String(dados.filtro || dados.q || "")
    .trim()
    .toLowerCase();
  // Consulta é compartilhada: todas as filiais veem todos os vales.
  // Privilegio de apagar/baixar fica na filial dona (checado nas outras ações).
  var filialLogada = normalizarFilial_(dados.filial || "");
  var limite = Number(dados.limite) || 100;
  var vales = [];

  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i];
    if (!ehLinhaValeValida_(r)) continue;

    var item = {
      numero: Number(r[0]),
      quantidade: r[1],
      valor: r[2],
      nome: r[3],
      dia: r[4],
      mes: r[5],
      ano: r[6],
      emitidoEm: r[7],
      motorista: r[8] || "",
      placa: r[9] || "",
      status: normalizarStatusVale_(r[10]),
      baixadoEm: r[11] || "",
      conferenteExpedidor: r[12] || "",
      conferenteRecebedor: r[13] || "",
      filial: String(r[14] || "").trim(),
      data: [r[4], r[5], r[6]].filter(Boolean).join("/") || "",
    };

    if (filtro) {
      var blob = [
        item.numero,
        item.quantidade,
        item.valor,
        item.nome,
        item.motorista,
        item.placa,
        item.conferenteExpedidor,
        item.conferenteRecebedor,
        item.filial,
        item.status,
        item.data,
        item.emitidoEm,
      ]
        .join(" ")
        .toLowerCase();
      if (blob.indexOf(filtro) === -1) continue;
    }

    vales.push(item);
    if (vales.length >= limite) break;
  }

  return json_({ ok: true, vales: vales, filialLogada: filialLogada });
}

/** Aceita só linhas de vale real (ignora cabeçalho e linhas vazias) */
function ehLinhaValeValida_(r) {
  if (!r || r.length < 1) return false;
  var numBruto = r[0];
  if (numBruto === "" || numBruto === null || numBruto === undefined) return false;

  var texto = String(numBruto).trim().toLowerCase();
  if (
    texto === "número" ||
    texto === "numero" ||
    texto === "nº" ||
    texto === "n°" ||
    texto === "vale"
  ) {
    return false;
  }

  var n = Number(numBruto);
  return !isNaN(n) && isFinite(n) && n > 0;
}

function buscarVale_(numero, filialOpcional) {
  var sheet = obterAbaVales_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) {
    return json_({ ok: false, erro: "Nenhum vale encontrado." });
  }

  var alvo = Number(numero);
  // Leitura/reimpressão: qualquer filial pode ver.
  var rows = sheet.getRange(2, 1, ultima, 15).getValues();

  for (var i = 0; i < rows.length; i++) {
    if (Number(rows[i][0]) === alvo) {
      var r = rows[i];
      var filialVale = String(r[14] || "").trim();
      return json_({
        ok: true,
        vale: {
          numero: r[0],
          quantidade: r[1],
          valor: r[2],
          nome: r[3],
          dia: r[4],
          mes: r[5],
          ano: r[6],
          emitidoEm: r[7],
          motorista: r[8] || "",
          placa: r[9] || "",
          status: normalizarStatusVale_(r[10]),
          baixadoEm: r[11] || "",
          conferenteExpedidor: r[12] || "",
          conferenteRecebedor: r[13] || "",
          filial: filialVale,
        },
      });
    }
  }

  return json_({ ok: false, erro: "Vale Nº " + numero + " não encontrado." });
}

function apagarVale_(dados) {
  var numero = Number(dados.numero);
  if (isNaN(numero)) {
    return json_({ ok: false, erro: "Número do vale inválido." });
  }

  var filialFiltro = normalizarFilial_(dados.filial || "");
  if (!filialFiltro) {
    return json_({
      ok: false,
      erro: "Faça login na filial para apagar vales.",
    });
  }

  // Confere senha da sessão da filial (mesmo critério do emitir)
  var auth = exigirFilialLogada_(dados.filial, dados.senhaFilial || dados.senha_filial);
  if (auth.erro) {
    return json_({ ok: false, erro: auth.erro });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = obterAbaVales_();
    var ultima = sheet.getLastRow();
    if (ultima < 2) {
      return json_({ ok: false, erro: "Nenhum vale para apagar." });
    }

    var rows = sheet.getRange(2, 1, ultima, 15).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i][0]) === numero) {
        var filialVale = normalizarFilial_(rows[i][14] || "");
        if (!filialVale || filialVale !== filialFiltro) {
          return json_({
            ok: false,
            erro:
              "Só a filial dona do vale pode apagar. Este vale é de " +
              (filialVale || "filial não informada") +
              ".",
          });
        }
        sheet.deleteRow(i + 2);
        return json_({
          ok: true,
          mensagem: "Vale Nº " + numero + " apagado.",
          numero: numero,
        });
      }
    }

    return json_({ ok: false, erro: "Vale Nº " + numero + " não encontrado." });
  } finally {
    lock.releaseLock();
  }
}

function baixarVale_(dados) {
  if (String(dados.documentoAssinado || "").toLowerCase() !== "sim") {
    return json_({
      ok: false,
      erro: "Confirme o recebimento do documento assinado antes de dar baixa.",
    });
  }

  var numero = Number(dados.numero);
  if (isNaN(numero) || numero <= 0) {
    return json_({ ok: false, erro: "Número do vale inválido." });
  }

  var filialFiltro = normalizarFilial_(dados.filial || "");
  if (!filialFiltro) {
    return json_({
      ok: false,
      erro: "Faça login na filial para dar baixa em vales.",
    });
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    var sheet = obterAbaVales_();
    var ultima = sheet.getLastRow();
    if (ultima < 2) {
      return json_({ ok: false, erro: "Nenhum vale encontrado." });
    }

    var rows = sheet.getRange(2, 1, ultima, 15).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i][0]) !== numero) continue;

      var filialVale = normalizarFilial_(rows[i][14] || "");
      if (!filialVale || filialVale !== filialFiltro) {
        return json_({
          ok: false,
          erro:
            "Só a filial dona do vale pode dar baixa. Este vale é de " +
            (filialVale || "filial não informada") +
            ".",
        });
      }

      var statusAtual = normalizarStatusVale_(rows[i][10]);
      if (statusAtual === "FECHADO") {
        return json_({
          ok: false,
          erro:
            "Vale Nº " +
            numero +
            " já foi fechado em " +
            (rows[i][11] || "data não informada") +
            ".",
        });
      }

      var agora = Utilities.formatDate(
        new Date(),
        "America/Sao_Paulo",
        "dd/MM/yyyy HH:mm:ss"
      );
      var linha = i + 2;
      sheet.getRange(linha, 11).setValue("FECHADO");
      sheet.getRange(linha, 12).setValue(agora);

      return json_({
        ok: true,
        numero: numero,
        status: "FECHADO",
        baixadoEm: agora,
        filial: filialVale || "",
        mensagem: "Vale Nº " + numero + " fechado com sucesso.",
      });
    }

    return json_({ ok: false, erro: "Vale Nº " + numero + " não encontrado." });
  } finally {
    lock.releaseLock();
  }
}

function normalizarStatusVale_(status) {
  var valor = String(status || "").trim().toUpperCase();
  return valor === "BAIXADO" || valor === "FECHADO" ? "FECHADO" : "EM ABERTO";
}

/* ===================== CLIENTES ===================== */

function listarClientes_(q) {
  var sheet = obterAbaClientes_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) {
    return json_({ ok: true, clientes: [] });
  }

  var rows = sheet.getRange(2, 1, ultima, 3).getValues();
  var filtro = String(q || "").trim().toLowerCase();
  var clientes = [];

  for (var i = 0; i < rows.length; i++) {
    var nome = String(rows[i][0] || "").trim();
    if (!nome) continue;

    if (filtro && nome.toLowerCase().indexOf(filtro) === -1) continue;

    clientes.push({
      nome: nome,
      telefone: String(rows[i][1] || ""),
      observacao: String(rows[i][2] || ""),
    });
  }

  clientes.sort(function (a, b) {
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return json_({ ok: true, clientes: clientes });
}

function salvarCliente_(dados) {
  var nome = String(dados.nome || "").trim();
  if (!nome) {
    return json_({ ok: false, erro: "Nome do cliente é obrigatório." });
  }

  var sheet = obterAbaClientes_();
  var idx = encontrarClienteRow_(sheet, nome);

  if (idx > 0) {
    if (dados.telefone !== undefined) {
      sheet.getRange(idx, 2).setValue(dados.telefone || "");
    }
    if (dados.observacao !== undefined) {
      sheet.getRange(idx, 3).setValue(dados.observacao || "");
    }
    return json_({ ok: true, mensagem: "Cliente atualizado.", nome: nome });
  }

  var agora = Utilities.formatDate(
    new Date(),
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
  sheet.appendRow([
    nome,
    dados.telefone || "",
    dados.observacao || "",
    agora,
  ]);

  return json_({ ok: true, mensagem: "Cliente cadastrado.", nome: nome });
}

function garantirCliente_(nome) {
  var sheet = obterAbaClientes_();
  if (encontrarClienteRow_(sheet, nome) > 0) return;

  var agora = Utilities.formatDate(
    new Date(),
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
  sheet.appendRow([nome, "", "", agora]);
}

function encontrarClienteRow_(sheet, nome) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return -1;

  var nomes = sheet.getRange(2, 1, ultima, 1).getValues();
  var alvo = nome.toLowerCase();

  for (var i = 0; i < nomes.length; i++) {
    if (String(nomes[i][0] || "").trim().toLowerCase() === alvo) {
      return i + 2;
    }
  }
  return -1;
}

/* ===================== MOTORISTAS / PLACAS ===================== */

function listarMotoristas_(q) {
  var sheet = obterAbaMotoristas_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) {
    return json_({ ok: true, motoristas: [] });
  }

  var rows = sheet.getRange(2, 1, ultima, 3).getValues();
  var filtro = String(q || "").trim().toLowerCase();
  var motoristas = [];

  for (var i = 0; i < rows.length; i++) {
    var nome = String(rows[i][0] || "").trim();
    var placa = normalizarPlaca_(rows[i][1]);
    var observacao = String(rows[i][2] || "");
    if (!nome || !placa) continue;

    var blob = [nome, placa, observacao].join(" ").toLowerCase();
    if (filtro && blob.indexOf(filtro) === -1) continue;

    motoristas.push({
      nome: nome,
      placa: placa,
      observacao: observacao,
    });
  }

  motoristas.sort(function (a, b) {
    var porNome = a.nome.localeCompare(b.nome, "pt-BR");
    return porNome || a.placa.localeCompare(b.placa, "pt-BR");
  });

  return json_({ ok: true, motoristas: motoristas });
}

function salvarMotorista_(dados) {
  var nome = String(dados.nome || dados.motorista || "").trim();
  var placa = normalizarPlaca_(dados.placa);
  if (!nome) {
    return json_({ ok: false, erro: "Nome do motorista é obrigatório." });
  }
  if (!placa) {
    return json_({ ok: false, erro: "Placa do veículo é obrigatória." });
  }

  var sheet = obterAbaMotoristas_();
  var idx = encontrarMotoristaRow_(sheet, nome, placa);

  if (idx > 0) {
    if (dados.observacao !== undefined) {
      sheet.getRange(idx, 3).setValue(dados.observacao || "");
    }
    return json_({
      ok: true,
      mensagem: "Motorista e placa atualizados.",
      nome: nome,
      placa: placa,
    });
  }

  var agora = Utilities.formatDate(
    new Date(),
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
  sheet.appendRow([nome, placa, dados.observacao || "", agora]);

  return json_({
    ok: true,
    mensagem: "Motorista e placa cadastrados.",
    nome: nome,
    placa: placa,
  });
}

function garantirMotorista_(nome, placa) {
  var sheet = obterAbaMotoristas_();
  placa = normalizarPlaca_(placa);
  if (encontrarMotoristaRow_(sheet, nome, placa) > 0) return;

  var agora = Utilities.formatDate(
    new Date(),
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
  sheet.appendRow([nome, placa, "", agora]);
}

function encontrarMotoristaRow_(sheet, nome, placa) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return -1;

  var rows = sheet.getRange(2, 1, ultima, 2).getValues();
  var nomeAlvo = String(nome || "").trim().toLowerCase();
  var placaAlvo = normalizarPlaca_(placa);

  for (var i = 0; i < rows.length; i++) {
    var mesmoNome =
      String(rows[i][0] || "").trim().toLowerCase() === nomeAlvo;
    var mesmaPlaca = normalizarPlaca_(rows[i][1]) === placaAlvo;
    if (mesmoNome && mesmaPlaca) return i + 2;
  }
  return -1;
}

function normalizarPlaca_(placa) {
  return String(placa || "").trim().toUpperCase().replace(/\s+/g, "");
}

/* ===================== CONFERENTES ===================== */

function listarConferentes_(q, tipo) {
  var sheet = obterAbaConferentes_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) {
    return json_({ ok: true, conferentes: [] });
  }

  var rows = sheet.getRange(2, 1, ultima, 4).getValues();
  var filtro = String(q || "").trim().toLowerCase();
  var tipoFiltro = normalizarTipoConferente_(tipo);
  var conferentes = [];

  for (var i = 0; i < rows.length; i++) {
    var nome = String(rows[i][0] || "").trim();
    if (!nome) continue;
    var tipoItem = normalizarTipoConferente_(rows[i][3] || "EXPEDIDOR");
    if (tipoFiltro && tipoItem !== tipoFiltro) continue;
    if (filtro && nome.toLowerCase().indexOf(filtro) === -1) continue;

    conferentes.push({
      nome: nome,
      observacao: String(rows[i][1] || ""),
      tipo: tipoItem,
    });
  }

  conferentes.sort(function (a, b) {
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  return json_({ ok: true, conferentes: conferentes });
}

function salvarConferente_(dados) {
  var nome = String(dados.nome || dados.conferente || "").trim();
  var tipo = normalizarTipoConferente_(dados.tipo);
  if (!nome) {
    return json_({ ok: false, erro: "Nome do conferente é obrigatório." });
  }
  if (!tipo) {
    return json_({ ok: false, erro: "Tipo do conferente é obrigatório." });
  }

  var sheet = obterAbaConferentes_();
  var idx = encontrarConferenteRow_(sheet, nome, tipo);

  if (idx > 0) {
    if (dados.observacao !== undefined) {
      sheet.getRange(idx, 2).setValue(dados.observacao || "");
    }
    return json_({
      ok: true,
      mensagem: "Conferente atualizado.",
      nome: nome,
    });
  }

  var agora = Utilities.formatDate(
    new Date(),
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
  sheet.appendRow([nome, dados.observacao || "", agora, tipo]);

  return json_({
    ok: true,
    mensagem: "Conferente cadastrado.",
    nome: nome,
  });
}

function garantirConferente_(nome, tipo) {
  var sheet = obterAbaConferentes_();
  tipo = normalizarTipoConferente_(tipo);
  if (encontrarConferenteRow_(sheet, nome, tipo) > 0) return;

  var agora = Utilities.formatDate(
    new Date(),
    "America/Sao_Paulo",
    "dd/MM/yyyy HH:mm:ss"
  );
  sheet.appendRow([nome, "", agora, tipo]);
}

function encontrarConferenteRow_(sheet, nome, tipo) {
  var ultima = sheet.getLastRow();
  if (ultima < 2) return -1;

  var rows = sheet.getRange(2, 1, ultima, 4).getValues();
  var alvo = String(nome || "").trim().toLowerCase();
  var tipoAlvo = normalizarTipoConferente_(tipo);

  for (var i = 0; i < rows.length; i++) {
    var nomeIgual = String(rows[i][0] || "").trim().toLowerCase() === alvo;
    var tipoIgual =
      normalizarTipoConferente_(rows[i][3] || "EXPEDIDOR") === tipoAlvo;
    if (nomeIgual && tipoIgual) {
      return i + 2;
    }
  }
  return -1;
}

function normalizarTipoConferente_(tipo) {
  var valor = String(tipo || "").trim().toUpperCase();
  return valor === "EXPEDIDOR" || valor === "RECEBEDOR" ? valor : "";
}

/* ===================== CONFIG / PREÇO ===================== */

function parsePrecoValor_(bruto) {
  var v = Number(
    String(bruto == null ? "" : bruto)
      .replace("R$", "")
      .replace(/\s/g, "")
      .replace(",", ".")
  );
  if (isNaN(v) || v <= 0) return null;
  return v;
}

/** Preço por filial (aba Filiais). Fallback: Config legado ou padrão. */
function pegarPrecoUnitario_(filial) {
  var nome = normalizarFilial_(filial);
  if (nome) {
    var info = encontrarLinhaFilial_(nome);
    if (info) {
      var precoFilial = parsePrecoValor_(info.preco);
      if (precoFilial != null) return precoFilial;
    }
  }

  var sheet = obterAbaConfig_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) return PRECO_PADRAO;

  var rows = sheet.getRange(2, 1, ultima, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === "preco_unitario") {
      var legado = parsePrecoValor_(rows[i][1]);
      return legado != null ? legado : PRECO_PADRAO;
    }
  }
  return PRECO_PADRAO;
}

/** Define o preço só da filial logada (coluna Preço pallet na aba Filiais). */
function definirPreco_(preco, dados) {
  dados = dados || {};
  var auth = exigirFilialLogada_(
    dados.filial,
    dados.senhaFilial || dados.senha_filial
  );
  if (auth.erro) {
    return json_({ ok: false, erro: auth.erro });
  }

  if (preco === undefined || preco === null || String(preco).trim() === "") {
    return json_({ ok: false, erro: "Informe o valor do pallet." });
  }

  var v = parsePrecoValor_(preco);
  if (v == null) {
    return json_({
      ok: false,
      erro:
        "Preço inválido (\"" +
        preco +
        "\"). Use um valor maior que zero, ex: 15 ou 15.50",
    });
  }

  var info = encontrarLinhaFilial_(auth.nome);
  if (!info) {
    return json_({ ok: false, erro: "Filial não cadastrada." });
  }

  info.sheet.getRange(info.linha, 4).setValue(v);
  return json_({
    ok: true,
    precoUnitario: v,
    filial: auth.nome,
    mensagem:
      "Preço da filial " + auth.nome + " atualizado para R$ " + v.toFixed(2).replace(".", ",") + ".",
  });
}

function pegarMarca_() {
  var marca = {
    nomeEmpresa: "BINHO",
    subtituloEmpresa: "Transportes",
    logoUrl: "",
  };
  var sheet = obterAbaConfig_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) return marca;

  var rows = sheet.getRange(2, 1, ultima, 2).getValues();
  for (var i = 0; i < rows.length; i++) {
    var chave = String(rows[i][0] || "").trim().toLowerCase();
    var valor = String(rows[i][1] || "").trim();
    if (chave === "nome_empresa" && valor) marca.nomeEmpresa = valor;
    if (chave === "subtitulo_empresa") marca.subtituloEmpresa = valor;
    if (chave === "logo_url") marca.logoUrl = valor;
  }
  return marca;
}

function definirMarca_(dados) {
  var nome = String(dados.nomeEmpresa || "").trim();
  var subtitulo = String(dados.subtituloEmpresa || "").trim();
  var logoUrl = String(dados.logoUrl || "").trim();
  var manterLogo = String(dados.manter_logo || "").toLowerCase() === "sim";

  if (!nome) {
    return json_({ ok: false, erro: "Informe o nome da empresa." });
  }
  if (
    !manterLogo &&
    logoUrl &&
    !/^https?:\/\//i.test(logoUrl) &&
    !/^data:image\/(png|jpeg|webp);base64,/i.test(logoUrl)
  ) {
    return json_({
      ok: false,
      erro:
        "A logo deve ser uma URL http(s) ou uma imagem anexada pelo sistema.",
    });
  }
  if (!manterLogo && logoUrl.length > 45000) {
    return json_({
      ok: false,
      erro: "Logo muito grande. Use o botão Anexar logo da empresa.",
    });
  }

  var sheet = obterAbaConfig_();
  salvarConfigValor_(sheet, "nome_empresa", nome);
  salvarConfigValor_(sheet, "subtitulo_empresa", subtitulo);
  if (!manterLogo) {
    salvarConfigValor_(sheet, "logo_url", logoUrl);
  }

  var marca = pegarMarca_();
  return json_({
    ok: true,
    marca: marca,
    mensagem: "Identidade da empresa atualizada.",
  });
}

function salvarConfigValor_(sheet, chave, valor) {
  var ultima = sheet.getLastRow();
  var rows = ultima >= 2 ? sheet.getRange(2, 1, ultima, 1).getValues() : [];
  var alvo = String(chave).toLowerCase();

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim().toLowerCase() === alvo) {
      sheet.getRange(i + 2, 2).setValue(valor);
      return;
    }
  }
  sheet.appendRow([chave, valor]);
}

function salvarLogo_(dados) {
  // Compatibilidade: o front agora usa logo_reset / logo_chunk / logo_commit (GET).
  return json_({
    ok: false,
    erro:
      "Atualize o index.html. O envio da logo agora usa o método seguro por pedaços.",
  });
}

function logoReset_() {
  var cache = CacheService.getScriptCache();
  var meta = cache.get("logo_meta");
  if (meta) {
    var total = Number(meta) || 0;
    for (var i = 0; i < total; i++) {
      cache.remove("logo_part_" + i);
    }
  }
  cache.remove("logo_meta");
  return json_({ ok: true, mensagem: "Pronto para receber a logo." });
}

function logoChunk_(dados) {
  var indice = Number(dados.i);
  var pedaco = String(dados.d || "");
  if (isNaN(indice) || indice < 0 || !pedaco) {
    return json_({ ok: false, erro: "Pedaço da logo inválido." });
  }
  if (pedaco.length > 1500) {
    return json_({ ok: false, erro: "Pedaço da logo muito grande." });
  }

  var cache = CacheService.getScriptCache();
  cache.put("logo_part_" + indice, pedaco, 600);
  var total = Number(cache.get("logo_meta") || "0");
  if (indice + 1 > total) {
    cache.put("logo_meta", String(indice + 1), 600);
  }
  return json_({ ok: true, i: indice });
}

function logoCommit_() {
  var cache = CacheService.getScriptCache();
  var total = Number(cache.get("logo_meta") || "0");
  if (!total || total < 1) {
    return json_({ ok: false, erro: "Nenhuma logo recebida para salvar." });
  }

  var partes = [];
  for (var i = 0; i < total; i++) {
    var pedaco = cache.get("logo_part_" + i);
    if (!pedaco) {
      return json_({
        ok: false,
        erro: "Faltou um pedaço da logo (" + i + "). Tente anexar novamente.",
      });
    }
    partes.push(pedaco);
    cache.remove("logo_part_" + i);
  }
  cache.remove("logo_meta");

  var dataUrl = partes.join("");
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) {
    return json_({
      ok: false,
      erro: "Imagem inválida após montagem. Use PNG, JPG ou WebP.",
    });
  }
  if (dataUrl.length > 45000) {
    return json_({
      ok: false,
      erro: "Logo muito grande depois da conversão. Use uma imagem mais leve.",
    });
  }

  salvarConfigValor_(obterAbaConfig_(), "logo_url", dataUrl);
  return json_({
    ok: true,
    logoUrl: dataUrl,
    mensagem: "Logo salva e fixada no sistema.",
  });
}

/* ===================== ESTRUTURA ===================== */

function obterPlanilha_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("COLE_O_ID") !== -1) {
    throw new Error(
      "Configure SPREADSHEET_ID no Code.gs com o ID da planilha (veja a URL do Google Sheets)."
    );
  }
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error(
      "Não foi possível abrir a planilha. Confira o SPREADSHEET_ID e se a conta tem acesso. " +
        String(err.message || err)
    );
  }
}

function garantirEstrutura_() {
  obterAbaVales_();
  obterAbaClientes_();
  obterAbaMotoristas_();
  obterAbaConferentes_();
  obterAbaConfig_();
  obterAbaFiliais_();
}

function obterAbaVales_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(ABA_VALES);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_VALES);
    sheet.appendRow([
      "Número",
      "Quantidade",
      "Valor",
      "Nome",
      "Dia",
      "Mês",
      "Ano",
      "Emitido em",
      "Motorista",
      "Placa",
      "Status",
      "Baixado em",
      "Conferente expedidor",
      "Conferente recebedor",
      "Filial",
    ]);
    sheet.getRange(1, 1, 1, 15).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // Migração suave: preserva vales antigos e acrescenta somente as novas colunas.
    if (!sheet.getRange(1, 9).getValue()) {
      sheet.getRange(1, 9).setValue("Motorista");
    }
    if (!sheet.getRange(1, 10).getValue()) {
      sheet.getRange(1, 10).setValue("Placa");
    }
    if (!sheet.getRange(1, 11).getValue()) {
      sheet.getRange(1, 11).setValue("Status");
    }
    if (!sheet.getRange(1, 12).getValue()) {
      sheet.getRange(1, 12).setValue("Baixado em");
    }
    var cabecalhoConferente = String(sheet.getRange(1, 13).getValue() || "");
    if (!cabecalhoConferente || cabecalhoConferente === "Conferente") {
      sheet.getRange(1, 13).setValue("Conferente expedidor");
    }
    if (!sheet.getRange(1, 14).getValue()) {
      sheet.getRange(1, 14).setValue("Conferente recebedor");
    }
    if (!sheet.getRange(1, 15).getValue()) {
      sheet.getRange(1, 15).setValue("Filial");
    }
    sheet.getRange(1, 9, 1, 7).setFontWeight("bold");
  }

  return sheet;
}

function obterAbaClientes_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(ABA_CLIENTES);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_CLIENTES);
    sheet.appendRow(["Nome", "Telefone", "Observação", "Cadastrado em"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function obterAbaMotoristas_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(ABA_MOTORISTAS);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_MOTORISTAS);
    sheet.appendRow(["Nome", "Placa", "Observação", "Cadastrado em"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function obterAbaConferentes_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(ABA_CONFERENTES);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_CONFERENTES);
    sheet.appendRow(["Nome", "Observação", "Cadastrado em", "Tipo"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else if (!sheet.getRange(1, 4).getValue()) {
    sheet.getRange(1, 4).setValue("Tipo").setFontWeight("bold");
  }

  return sheet;
}

function obterAbaConfig_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(ABA_CONFIG);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_CONFIG);
    sheet.appendRow(["Chave", "Valor"]);
    sheet.appendRow(["preco_unitario", PRECO_PADRAO]);
    sheet.getRange(1, 1, 1, 2).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/* ===================== FILIAIS / LOGIN ===================== */

function obterAbaFiliais_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(ABA_FILIAIS);

  if (!sheet) {
    sheet = ss.insertSheet(ABA_FILIAIS);
    sheet.appendRow(["Filial", "Senha", "Cadastrado em", "Preço pallet"]);
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    if (!sheet.getRange(1, 1).getValue()) sheet.getRange(1, 1).setValue("Filial");
    if (!sheet.getRange(1, 2).getValue()) sheet.getRange(1, 2).setValue("Senha");
    if (!sheet.getRange(1, 3).getValue()) sheet.getRange(1, 3).setValue("Cadastrado em");
    if (!sheet.getRange(1, 4).getValue()) sheet.getRange(1, 4).setValue("Preço pallet");
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
  }

  garantirFiliaisPadrao_(sheet);
  return sheet;
}

function garantirFiliaisPadrao_(sheet) {
  sheet = sheet || obterAbaFiliais_();
  var ultima = sheet.getLastRow();
  var existentes = {};

  if (ultima >= 2) {
    var nomes = sheet.getRange(2, 1, ultima, 1).getValues();
    for (var i = 0; i < nomes.length; i++) {
      var n = normalizarFilial_(nomes[i][0]);
      if (n) existentes[n] = true;
    }
  }

  for (var j = 0; j < FILIAIS_PADRAO.length; j++) {
    var filial = FILIAIS_PADRAO[j];
    if (!existentes[filial]) {
      sheet.appendRow([filial, "", "", PRECO_PADRAO]);
    }
  }

  // Garante preço padrão nas linhas que ainda não têm valor na coluna 4
  ultima = sheet.getLastRow();
  if (ultima >= 2) {
    var precos = sheet.getRange(2, 4, ultima, 4).getValues();
    for (var k = 0; k < precos.length; k++) {
      if (parsePrecoValor_(precos[k][0]) == null) {
        sheet.getRange(k + 2, 4).setValue(PRECO_PADRAO);
      }
    }
  }
}

function normalizarFilial_(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function listarFiliais_() {
  var sheet = obterAbaFiliais_();
  var ultima = sheet.getLastRow();
  var mapa = {};
  var lista = [];

  if (ultima >= 2) {
    var rows = sheet.getRange(2, 1, ultima, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      var nome = normalizarFilial_(rows[i][0]);
      if (!nome) continue;
      mapa[nome] = {
        nome: nome,
        temSenha: String(rows[i][1] || "").trim() !== "",
      };
    }
  }

  for (var j = 0; j < FILIAIS_PADRAO.length; j++) {
    var padrao = FILIAIS_PADRAO[j];
    lista.push(mapa[padrao] || { nome: padrao, temSenha: false });
    delete mapa[padrao];
  }

  for (var extra in mapa) {
    if (Object.prototype.hasOwnProperty.call(mapa, extra)) {
      lista.push(mapa[extra]);
    }
  }

  return json_({ ok: true, filiais: lista });
}

function encontrarLinhaFilial_(filial) {
  var nome = normalizarFilial_(filial);
  if (!nome) return null;

  var sheet = obterAbaFiliais_();
  var ultima = sheet.getLastRow();
  if (ultima < 2) return null;

  var rows = sheet.getRange(2, 1, ultima, 4).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (normalizarFilial_(rows[i][0]) === nome) {
      return {
        linha: i + 2,
        nome: nome,
        senha: String(rows[i][1] || ""),
        preco: rows[i][3],
        sheet: sheet,
      };
    }
  }
  return null;
}

/**
 * Login da filial.
 * - Sem senha: PRIMEIRO ACESSO → cadastra a senha UMA VEZ (definitiva por filial).
 * - Com senha: só valida. NÃO altera pelo site.
 * - Troca de senha: somente editando a aba Filiais na planilha Google.
 */
function loginFilial_(dados) {
  var filial = normalizarFilial_(dados.filial);
  var senha = String(dados.senha || "");
  var confirmacao = String(
    dados.confirmarSenha != null
      ? dados.confirmarSenha
      : dados.confirmacao != null
        ? dados.confirmacao
        : dados.confirmar_senha || ""
  );

  // Bloqueia qualquer tentativa de troca de senha via API do site
  if (
    dados.novaSenha ||
    dados.nova_senha ||
    dados.alterarSenha ||
    dados.alterar_senha ||
    String(dados.actionTroca || "").trim() !== ""
  ) {
    return json_({
      ok: false,
      erro:
        "A senha da filial é definitiva. Somente quem tem acesso à planilha (aba Filiais) pode alterar.",
    });
  }

  if (!filial) {
    return json_({ ok: false, erro: "Selecione a filial." });
  }
  if (!senha || senha.length < 4) {
    return json_({
      ok: false,
      erro: "A senha deve ter pelo menos 4 caracteres.",
    });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var info = encontrarLinhaFilial_(filial);
    if (!info) {
      return json_({ ok: false, erro: "Filial não cadastrada." });
    }

    var senhaSalva = String(info.senha || "").trim();

    // Já tem senha: NUNCA sobrescreve — só autentica
    if (senhaSalva) {
      if (senha !== senhaSalva) {
        return json_({ ok: false, erro: "Senha incorreta." });
      }
      return json_({
        ok: true,
        filial: info.nome,
        primeiroAcesso: false,
        senhaDefinitiva: true,
        precoUnitario: pegarPrecoUnitario_(info.nome),
        mensagem: "Login ok: " + info.nome,
      });
    }

    // Primeiro acesso desta filial: define a senha para sempre
    if (confirmacao !== senha) {
      return json_({
        ok: false,
        erro: "Confirmação de senha não confere.",
        primeiroAcesso: true,
      });
    }

    var agora = Utilities.formatDate(
      new Date(),
      "America/Sao_Paulo",
      "dd/MM/yyyy HH:mm:ss"
    );
    info.sheet.getRange(info.linha, 2).setValue(senha);
    info.sheet.getRange(info.linha, 3).setValue(agora);
    if (parsePrecoValor_(info.preco) == null) {
      info.sheet.getRange(info.linha, 4).setValue(PRECO_PADRAO);
    }

    return json_({
      ok: true,
      filial: info.nome,
      primeiroAcesso: true,
      senhaDefinitiva: true,
      precoUnitario: pegarPrecoUnitario_(info.nome),
      mensagem:
        "Senha definitiva cadastrada para " +
        info.nome +
        ". Ela não muda pelo site — só na planilha (aba Filiais).",
    });
  } finally {
    lock.releaseLock();
  }
}

/** Confere filial + senha já cadastrada (usado ao emitir). */
function exigirFilialLogada_(filial, senhaFilial) {
  var nome = normalizarFilial_(filial);
  if (!nome) {
    return { erro: "Faça login na filial antes de emitir." };
  }

  var info = encontrarLinhaFilial_(nome);
  if (!info) {
    return { erro: "Filial não cadastrada." };
  }

  var senhaSalva = String(info.senha || "").trim();
  if (!senhaSalva) {
    return { erro: "Filial ainda sem senha. Faça o primeiro acesso." };
  }

  if (String(senhaFilial || "") !== senhaSalva) {
    return { erro: "Sessão da filial inválida. Entre novamente." };
  }

  return { nome: info.nome };
}

function pegarProximoNumero_(sheet) {
  sheet = sheet || obterAbaVales_();
  var ultima = sheet.getLastRow();

  if (ultima < 2) return NUMERO_INICIAL;

  var valores = sheet.getRange(2, 1, ultima, 1).getValues();
  var maior = NUMERO_INICIAL - 1;

  for (var i = 0; i < valores.length; i++) {
    var n = Number(valores[i][0]);
    if (!isNaN(n) && n > maior) maior = n;
  }

  return maior + 1;
}

function formatarMoeda_(n) {
  var fixed = Number(n || 0).toFixed(2).replace(".", ",");
  return "R$ " + fixed;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
