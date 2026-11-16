# Sant Ana Alchemy — Motor Gratuito

**Livros para descobrir. Fórmulas para aprender. Preparações para usar nas suas aventuras.**

Versão 0.1.5 • Marcelo Sant Ana / Sant Ana RPG Press · [English](README.md)

O Sant Ana Alchemy leva as regras de fabricação do *Compêndio de Alquimia* para o Foundry: o personagem estuda um livro físico, reúne os ingredientes, resolve o teste de fabricação e avança na memorização da fórmula. A demonstração é gratuita e usa o mesmo motor dos pacotes completos do livro.

Motor de fabricação alquímica para Foundry VTT 14 e o sistema dnd5e. A interface está disponível em português e inglês. Esta é uma versão pública de testes; a homologação completa da fabricação em mesa real permanece pendente.

## O que está incluído

- Pastas de Itens para Ingredientes, Livros e Produtos Prontos.
- Pasta de Diário para Receitas; fórmulas são notas, e os livros físicos são os itens que circulam no jogo.
- Macros de fabricação e gerenciamento, além de botões com frasco nos controles de tokens.
- Escolha por livro no inventário ou por fórmula memorizada na ficha.
- Primeiro estudo, nível alquímico, ferramentas, proficiência, ingredientes e quantidades.
- CDs e tempos C1–C5, condições gerais, Acelerar, Jogar Seguro e Desafio Heroico.
- Rolagem, consumo, entrega do produto e registro de progresso/memorização.
- Importação de kits JSON e reconhecimento de módulos de conteúdo compatíveis.
- Demonstração gratuita: cinco fórmulas C1, dez ingredientes, cinco livros físicos, cinco notas e os modelos dos cinco produtos prontos.

| Fórmula incluída | Uso na aventura |
|---|---|
| Conservante de Água | Conservar água potável durante viagens |
| Antisséptico Rústico | Estabilizar uma criatura com 0 PV |
| Fogo Instável | Arremessar uma preparação que causa dano de fogo |
| Fumaça Distrativa | Dificultar testes de Percepção que dependam da visão |
| Tinta Reveladora | Encontrar vestígios recentes de sangue e saliva |

Todas são C1, com CD 9 e tempo normal de fabricação de um minuto. Consulte as descrições dos produtos para as regras completas de uso e suas limitações. O pacote C1 completo contém 25 fórmulas; o livro reúne 125 fórmulas C1–C5.

O forrageamento e os pacotes comerciais C1–C5 permanecem produtos separados. O conteúdo completo do PDF não é distribuído neste módulo.

## O livro completo e seus bônus

O **Compêndio de Alquimia**, de Marcelo Sant Ana, amplia a coleção para **125 fórmulas distribuídas entre C1 e C5 e 110 ingredientes**.

A compra do livro inclui os **pacotes completos C1–C5 para Foundry VTT e o módulo de forrageamento como bônus**. Eles utilizam este mesmo motor gratuito. Ao importar o C1 completo, as fórmulas e os ingredientes compartilhados com a demonstração são reaproveitados pelos mesmos identificadores.

**[Livro em português e bônus para Foundry](https://payhip.com/b/sUa8I)** · **[English edition and Foundry bonus](https://payhip.com/b/6Z0ru)**

[Sant Ana RPG Press na Payhip](https://payhip.com/SantAnaRPGPress)

## Instalar pelo endereço público

1. Na tela inicial do Foundry, abra **Módulos adicionais → Instalar módulo**.
2. Cole o endereço abaixo no campo **URL do manifesto / Manifest URL** e clique em **Instalar**.
3. Abra um mundo dnd5e, ative **Sant Ana Alchemy — Crafting Engine** em **Gerenciar Módulos** e entre como mestre.

```text
https://raw.githubusercontent.com/tecficcao-design/santana-alchemy/main/module.json
```

O mesmo endereço permite que o Foundry consulte futuras atualizações. Esta versão é distribuída por link direto; o cadastro no catálogo oficial ainda não foi solicitado. Comece em um mundo de testes.

## Alternativa: instalar manualmente

1. Extraia a pasta `santana-alchemy` deste ZIP.
2. Coloque essa pasta dentro de `Data/modules/` do Foundry, preservando o nome. O arquivo final deve estar em `Data/modules/santana-alchemy/module.json`.
3. Reinicie o processo do Foundry para ele reconhecer o novo módulo.
4. Abra um mundo dnd5e e ative **Sant Ana Alchemy — Crafting Engine** em Gerenciar Módulos. Recarregue a página quando o Foundry solicitar.
5. Entre como mestre. As pastas e as duas macros são criadas automaticamente. Se necessário, use **Configurações → Configurar opções → Sant Ana Alchemy → Abrir gerenciador**.

Na Molten Hosting, faça a cópia da pasta pelo gerenciador de arquivos disponibilizado pela hospedagem, dentro da pasta `Data/modules` da instância existente. A pasta precisa ser extraída; apenas guardar o ZIP nessa pasta não instala o módulo. O pacote não contrata serviços nem muda o plano de hospedagem.

Os arquivos de instalação estão hospedados no repositório público. A homologação completa e o processo de submissão ao Foundry ainda são necessários antes do cadastro no catálogo oficial.

## Primeira demonstração

1. Use um mundo de testes dnd5e no seu servidor atual.
2. Execute **Alquimia — Gerenciar** e escolha **Instalar kit → Demonstração C1 — Cinco Fórmulas**.
3. Crie um personagem de teste com Inteligência definida.
4. Para começar pelo Conservante de Água, arraste seu livro e uma porção de Besouro de Sal e de Madeira Encharcada das pastas de Itens para a ficha. Para outra fórmula, entregue seu próprio livro e os ingredientes listados nela.
5. Acrescente Suprimentos de Alquimista à ficha. Se a ferramenta vier de uma importação antiga ou representar equipamento emprestado, o mestre pode registrar o acesso físico no gerenciador.
6. Selecione o token do personagem ou vincule-o ao usuário. Execute **Alquimia — Fabricar Item**.
7. Consulte o livro e registre a hora de estudo combinada com o mestre.
8. Selecione novamente a receita, confira materiais, escolha o ritmo e confirme o tempo de jogo.
9. Resolva o teste. Os ingredientes são consumidos no teste; o livro permanece. Um sucesso cria o produto na ficha.
10. Use Progresso para conferir memorização. Depois que a fórmula estiver memorizada, retire o livro da ficha e verifique a opção **Usar receita memorizada**.

Um mestre precisa estar conectado para atender os pedidos. Os jogadores só precisam ser proprietários das suas fichas e ter acesso normal às macros. Os pedidos usam documentos privados do chat, e o mestre conectado os processa em sequência. Não é necessário Socketlib, Item Macro, Midi-QOL ou Item Piles para este motor.

## Atualizar uma demonstração já instalada

Atualize o motor no Foundry e instale novamente **Demonstração C1 — Cinco Fórmulas** no gerenciador. O identificador do kit permanece igual: os documentos do Conservante de Água são reutilizados, e as quatro novas fórmulas são acrescentadas. A opção explícita de atualizar modelos aplica os textos, preços e ícones ampliados aos modelos existentes do mundo. Cópias nas fichas e o progresso de estudo e memorização são preservados. Os identificadores também são os mesmos do pacote C1 completo, permitindo reaproveitar o conteúdo ao importá-lo.

## Regras e decisões do mestre

O módulo utiliza as regras básicas do Compêndio de Alquimia do projeto, incluindo:

| Complexidade | CD base | Tempo base |
|---|---:|---:|
| C1 | 9 | 1 minuto |
| C2 | 12 | 10 minutos |
| C3 | 15 | 1 hora |
| C4 | 18 | 2 horas |
| C5 | 21 | 4 horas |

- C1 e C2 admitem tentativa sem proficiência, com ferramenta adequada.
- C3 exige proficiência, exceto supervisão de mentor autorizada pelo mestre. C4 e C5 exigem proficiência própria.
- O teste usa Inteligência e a ferramenta escolhida. Duas ferramentas não somam proficiência duas vezes.
- 1 natural é Falha Crítica; 20 natural é sucesso depois de cumpridos os requisitos de acesso.
- Proficiência mitiga Falhas Moderadas para Leves e Graves para Moderadas; não reduz Falha Crítica.
- Memorização usa `máximo(1, 4 × complexidade − modificador permanente de INT − bônus de proficiência compatível)`. O bônus de proficiência entra uma vez, mesmo com especialização.
- O progresso conta fórmulas distintas. O mestre confirma os requisitos de narrativa e ajusta o nível alquímico no gerenciador.
- O tempo é tempo de jogo confirmado, e não um cronômetro de parede. O módulo não avança calendários automaticamente.

**Decisões que permanecem na mesa nesta versão:** danos, condições, contaminação, limitação de produto defeituoso, perda adicional em Falha Grave C3, aprimoramento heroico e efeitos narrativos. A consequência aparece na ficha/chat; o mestre a aplica. Um produto parcial C1–C3 recebe aviso de revisão e não conta como sucesso.

Especializações, lotes, pesquisa, instalações, qualidade, integridade e outros módulos opcionais do livro ainda são administrados pelo mestre. O motor não aplica automaticamente características da classe Alquimista. A aplicação do efeito final de cada produto depende da configuração fornecida pelo kit; a demonstração cria um item de referência com instruções completas, e o mestre conduz sua utilização.

## Inventário e dados anteriores

O reconhecimento usa identificadores permanentes em `flags.santana-alchemy`, preservados ao arrastar cópias dos itens. Itens com o mesmo nome vindos de compêndios antigos não são convertidos automaticamente. Isso evita confundir fórmulas, livros ou produtos com ingredientes.

Itens dentro de bolsas continuam pertencendo à coleção de itens da ficha e são contados. Recursos de outras fichas, estoques de comerciantes ou depósitos externos precisam ser transferidos ao personagem primeiro. Frascos ou outros materiais só são exigidos quando declarados pela receita.

A importação repetida reutiliza identidades. A opção de atualizar modelos é explícita e substitui os modelos do mundo; cópias já entregues a personagens permanecem como estavam. Traduções usam as mesmas identidades, para não duplicar ingredientes.

## Recuperação de interrupções

Se uma escrita falhar antes de concluir a fabricação, o motor tenta compensar a operação. Se não for possível determinar um estado seguro, a ficha recebe um registro pendente e novas fabricações ficam bloqueadas.

O mestre abre **Gerenciar → Configurar personagem**, confere o registro e o inventário, corrige o que for necessário e confirma a reconciliação. Liberar pedidos não altera quantidades. Após perda de conexão, confira o resultado e o estoque antes de enviar novamente um pedido.

## Estado de validação

- 66 testes automatizados em Node passaram, cobrindo regras, fabricação das cinco fórmulas em português e inglês, atualização da demonstração antiga, importação repetida, permissões, concorrência e recuperação de falhas.
- As APIs usadas foram conferidas na documentação pública do Foundry 14.
- A execução em uma instalação real de Foundry 14/dnd5e ainda precisa ser homologada. O manifesto não declara uma versão como `verified` antes desse teste.

Para repetir os testes: `node --test tests/*.test.mjs` na pasta do módulo. Não é preciso instalar dependências de desenvolvimento.

Consulte `KIT_FORMAT.md` para produzir os futuros pacotes. O código-fonte e os testes acompanham esta distribuição gratuita.

## Uso gratuito e conteúdo completo

O uso deste módulo no Foundry VTT é gratuito. Os direitos autorais e os demais direitos permanecem reservados a Marcelo Sant Ana; este pacote não adota uma licença de código aberto. Consulte [LICENSE.md](LICENSE.md).

A permissão abrange somente este motor e sua demonstração. O livro, os pacotes completos C1–C5 e o módulo de forrageamento são disponibilizados separadamente aos compradores: [Sant Ana RPG Press na Payhip](https://payhip.com/SantAnaRPGPress).
