# Tutorial de uso — Vale Pallet (BINHO Transportes)

Guia rápido para operar o sistema online. Os dados ficam na planilha do Google Sheets.

**Site:** https://carloscardosokr-boop.github.io/vale_pallet/

---

## 1. Como entrar

1. Abra o link do site no navegador (Chrome, Edge, etc.).
2. Na tela de login:
   - Escolha a **filial** (é o “usuário”).
   - Digite a **senha**.
3. Clique em **Entrar**.

### Filiais disponíveis

- ALTAMIRA  
- GOIANIA  
- RIO DE JANEIRO  
- SERRA  
- BRASILIA  
- GUARULHOS  

### Primeiro acesso da filial

Se a filial ainda **não tem senha**:

1. Selecione a filial.
2. Crie uma senha (mínimo 4 caracteres).
3. Confirme a senha.
4. Clique em **Cadastrar senha e entrar**.

A senha fica salva na planilha (aba **Filiais**). Nos próximos acessos, use só filial + senha.

### Sessão de 30 minutos

- Depois do login, você tem **30 minutos** de uso.
- O tempo restante aparece no topo (`resta 29:45`).
- Quando acabar (ou se clicar em **Sair**), a tela **bloqueia** e pede de novo:
  - **Filial**
  - **Senha**
- Ao **abrir ou atualizar** o site, também é preciso entrar de novo.

---

## 2. Emitir vale

Aba **Emitir**.

1. Confira no topo se a **filial correta** está logada.
2. Preencha:
   - Quantidade de pallets (o valor é calculado sozinho)
   - Nome do cliente
   - Nome do motorista
   - Placa
   - Conferente expedidor
   - Conferente recebedor
   - Data (já vem com o dia de hoje)
3. Clique para salvar / emitir.
4. O sistema grava na planilha e abre a **impressão**.
5. Peça a **assinatura do cliente** no papel impresso.

**Importante:** o vale fica registrado na filial que estava logada no momento da emissão.

Dicas:

- Ao digitar cliente, motorista ou conferente, aparecem sugestões do cadastro.
- Se for um nome novo, ele é cadastrado automaticamente ao emitir.

---

## 3. Consultar vales

Aba **Consultar**.

- Mostra **somente os vales da filial logada**.
- Colunas principais: Nº, Filial, Qtd, Valor, Cliente, Motorista, Placa, Conferentes, Situação, Datas.
- Use a busca por número, cliente, motorista, placa etc.
- **Reimprimir:** carrega o vale para imprimir de novo (assinatura em branco).
- **Apagar:** pede a **senha de exclusão** (não é a senha da filial). Use com cuidado — não tem volta.

---

## 4. Baixa de vale

Aba **Baixa de vale**.

Use quando o pallet / documento voltar e o vale for fechado.

1. Bipe o código de barras **ou** digite o número do vale.
2. Marque a confirmação de que o documento assinado foi recebido.
3. Clique em **Dar baixa no vale**.

O status passa de **EM ABERTO** para **FECHADO**, com data/hora da baixa.

Só é possível dar baixa em vale da **mesma filial** logada. Vale já fechado não recebe segunda baixa.

---

## 5. Cadastros auxiliares

### Clientes

Aba **Clientes** — cadastrar ou consultar nomes usados no autocomplete.

### Motoristas

Aba **Motoristas** — nome + placa.

### Conferentes

Aba **Conferentes** — expedidor ou recebedor.

Esses cadastros são compartilhados na planilha e ajudam na digitação na emissão.

---

## 6. Configurações

Aba **Configurações**.

- Alterar o **preço por pallet** (usado no cálculo do valor).
- Alterar nome / subtítulo / logo da empresa no vale.

Vales já emitidos **não mudam** quando o preço ou a marca são alterados depois.

---

## 7. O que cada pessoa precisa saber no dia a dia

| Situação | O que fazer |
|----------|-------------|
| Abrir o sistema | Entrar com filial + senha |
| Emitir vale | Aba Emitir → preencher → imprimir → assinar |
| Ver vales da minha unidade | Aba Consultar |
| Fechar vale devolvido | Aba Baixa de vale |
| Tela pediu login de novo | Sessão de 30 min acabou ou a página foi atualizada |
| Esqueci a senha da filial | Peça ao responsável para limpar a senha na aba **Filiais** da planilha (aí a filial cadastra de novo no próximo acesso) |

---

## 8. Planilha Google Sheets (visão geral)

O programa grava e lê nestas abas:

| Aba | Conteúdo |
|-----|----------|
| **Vales** | Todos os vales (com coluna **Filial**) |
| **Filiais** | Lista de filiais e senhas |
| **Clientes** | Cadastro de clientes |
| **Motoristas** | Cadastro de motoristas/placas |
| **Conferentes** | Cadastro de conferentes |
| **Config** | Preço e identidade visual |

Você pode continuar abrindo e usando a planilha normalmente. O site e a planilha usam os **mesmos dados**.

---

## 9. Problemas comuns

**Não conecta / erro de ação inválida**  
O Apps Script pode estar desatualizado. O responsável deve colar o `Code.gs` novo e publicar uma **Nova versão** da implantação.

**Não aparece vale de outra filial**  
É normal: cada login só enxerga a própria filial.

**Esqueci a senha da filial**  
Na planilha, aba **Filiais**, apague a senha daquela linha. No próximo login, a tela pedirá para cadastrar senha de novo (primeiro acesso).

**Site antigo no navegador**  
Atualize com **Ctrl + F5**.

---

## 10. Contato / responsável técnico

Em caso de dúvida sobre senha de filial, exclusão de vale ou atualização do sistema, fale com o responsável da qualidade / TI da BINHO Transportes.

---

*Documento gerado para o sistema Vale Pallet — BINHO Transportes.*
