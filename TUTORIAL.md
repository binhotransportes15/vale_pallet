# Tutorial de uso — Vale Pallet (BINHO Transportes)

Guia rápido para operar o sistema online. Os dados ficam na planilha do Google Sheets.

**Site:** https://binhotransportes15.github.io/vale_pallet/

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

Essa senha fica **definitiva para aquela filial** (salva na planilha, aba **Filiais**).

- O site **não permite trocar** a senha depois.
- Só quem tem **acesso à planilha Google** consegue alterar (editando ou apagando a senha na aba **Filiais**).
- Cada filial tem a **sua própria** senha (definida no primeiro uso dela).

Nos próximos acessos: só escolher a filial e digitar a senha já cadastrada.

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

- Mostra os vales de **todas as filiais** (visão compartilhada).
- Colunas principais: Nº, Filial, Qtd, Valor, Cliente, Motorista, Placa, Conferentes, Situação, Datas.
- Use a busca por número, cliente, motorista, placa, filial etc.
- **Reimprimir:** disponível para qualquer vale (só leitura/impressão).
- **Apagar:** só aparece nos vales da **sua** filial. Nos de outra filial fica “Só leitura”.
- **Baixa:** na aba Baixa, só funciona para vales da filial logada.

Resumo de privilégios por login:

| Ação | Própria filial | Outra filial |
|------|----------------|--------------|
| Ver na consulta | Sim | Sim |
| Reimprimir | Sim | Sim |
| Emitir / lançar | Sim | — |
| Apagar | Sim | Não |
| Dar baixa | Sim | Não |

---

## 4. Baixa de vale

Aba **Baixa de vale**.

Use quando o pallet / documento voltar e o vale for fechado.

1. Bipe o código de barras **ou** digite o número do vale.
2. Marque a confirmação de que o documento assinado foi recebido.
3. Clique em **Dar baixa no vale**.

O status passa de **EM ABERTO** para **FECHADO**, com data/hora da baixa.

Só é possível dar baixa em vale da **mesma filial** logada (dono do lançamento). Vale de outra filial pode ser visto na consulta, mas a baixa é recusada. Vale já fechado não recebe segunda baixa.

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
| Esqueci a senha da filial | Responsável com acesso à planilha altera/apaga na aba **Filiais** (pelo site não muda) |

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
Agora a consulta mostra todas. Se não aparecer, atualize o `Code.gs` no Apps Script (Nova versão) e dê Ctrl+F5 no site.

**Esqueci a senha da filial**  
Somente quem tem acesso à planilha: abra a aba **Filiais**, apague (ou troque) a senha daquela linha.  
- Se **apagar** a senha → no próximo login a filial faz “primeiro acesso” e define uma senha nova (de novo definitiva).  
- Se **trocar** na planilha → use a nova senha no site.  
Pelo site **não dá** para alterar.

**Site antigo no navegador**  
Atualize com **Ctrl + F5**.

---

## 10. Contato / responsável técnico

Em caso de dúvida sobre senha de filial, exclusão de vale ou atualização do sistema, fale com o responsável da qualidade / TI da BINHO Transportes.

---

*Documento gerado para o sistema Vale Pallet — BINHO Transportes.*
