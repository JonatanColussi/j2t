# J2T ~Jira to TradingWorks~

Este projeto foi criado para auxiliar os colaboradores da Datum à sincronizarem as horas lançadas no Jira do Banco Topázio para o TradingWorks

## 1. Instalando o projeto

No terminal, rode o comando abaixo para instalar a ferramenta globalmente

```bash
npm i -g git+https://github.com/JonatanColussi/j2t.git
```

## 2. Fazendo a configuração

No terminal, rode o comando abaixo para iniciar a configuração

```bash
j2t configure
```

a ferramenta irá pedir:

1. seu usuário do Jira
2. sua senha do Jira
1. seu email do TradingWorks
2. sua senha do TradingWorks

> *Durante a configuração, a ferramenta irá logar no Jira para validar as credenciais informadas, por isso é importante que a VPN esteja conectada

> *Essas configurações ficarão salvas em seu computador, você não precisará configurar novamente.

## 3. Fazendo a sincronização

No terminal, rode o comando abaixo para fazer a sinconização

```bash
j2t sync
```

> *Durante a sincronização, a ferramenta irá logar no Jira para obter as horas lançadas, por isso é importante que a VPN esteja conectada