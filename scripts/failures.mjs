import {localText} from "./core.mjs";
const texts = {
  1: {
    mild:["Produto fraco ou parcial. O mestre reduz pela metade a duração ou um valor numérico.","Weak or partial product. The GM halves its duration or one numeric value."],
    moderate:["Nenhum produto. Os ingredientes são consumidos.","No product. Ingredients are consumed."],
    severe:["1d4 de dano apropriado ao criador ou um incômodo mecânico leve, a critério do mestre.","The creator takes 1d4 appropriate damage or a minor mechanical inconvenience, chosen by the GM."],
    critical:["1d6 de dano ao criador; o local fica contaminado ou inutilizado até ser limpo.","The creator takes 1d6 damage; the work area is contaminated or unusable until cleaned."]
  },
  2: {
    mild:["Produto incompleto com uma limitação definida pelo mestre.","Incomplete product with a limitation chosen by the GM."],
    moderate:["Nenhum produto; desvantagem na próxima rolagem diretamente relacionada à mistura.","No product; disadvantage on the next roll directly related to this mixture."],
    severe:["1d6 de dano apropriado ou condição curta de uma rodada, a critério do mestre.","1d6 appropriate damage or an appropriate condition for one round, chosen by the GM."],
    critical:["Reação fora de controle: 2d6 de dano apropriado ao criador.","Uncontrolled reaction: the creator takes 2d6 appropriate damage."]
  },
  3: {
    mild:["Produto utilizável, mas defeituoso. O mestre acrescenta uma limitação clara.","Usable but defective product. The GM adds a clear limitation."],
    moderate:["Condição negativa apropriada por um minuto, escolhida pelo mestre.","An appropriate adverse condition for one minute, chosen by the GM."],
    severe:["2d6 de dano apropriado e perda de uma porção adicional de um ingrediente da receita, se disponível.","2d6 appropriate damage and one additional portion of a recipe ingredient lost, if available."],
    critical:["Explosão alquímica: 3d6 de dano apropriado e Contaminação Leve (desvantagem na produção por 1d4 horas).", "Alchemical explosion: 3d6 appropriate damage and Mild Contamination (disadvantage on crafting for 1d4 hours)."]
  },
  4: {
    mild:["O produto manifesta um efeito menor imprevisível; o mestre define o resultado.","The product manifests a lesser unpredictable effect; the GM determines the result."],
    moderate:["Condição séria apropriada por dez minutos, escolhida pelo mestre.","An appropriate serious condition for ten minutes, chosen by the GM."],
    severe:["3d6 de dano apropriado e uma mutação temporária definida pelo mestre.","3d6 appropriate damage and a temporary mutation defined by the GM."],
    critical:["4d6 de dano apropriado e Contaminação Persistente; tratamento definido pelo mestre.","4d6 appropriate damage and Persistent Contamination; treatment determined by the GM."]
  },
  5: {
    mild:["O resultado surge distorcido e perigoso, sem satisfazer a intenção original. O mestre define suas propriedades.","A distorted, dangerous result that does not fulfill its original purpose. The GM determines its properties."],
    moderate:["A reação produz um efeito hostil ou uma criatura instável, definida pelo mestre.","The reaction produces a hostile effect or unstable creature, determined by the GM."],
    severe:["Catástrofe local: explosão, transformação ou ruptura ambiental, definida pelo mestre.","Local catastrophe: explosion, transformation or environmental rupture, determined by the GM."],
    critical:["A criação adquire consciência, deixa marca permanente ou provoca desastre narrativo de grande alcance, definido pelo mestre.","The creation gains consciousness, leaves a permanent mark or causes a major narrative disaster, determined by the GM."]
  }
};
export function failureText(recipe, severity, language) {
  const override = recipe.failures?.[severity];
  return override ? localText(override.text, language) : texts[recipe.complexity][severity][language.startsWith("pt") ? 0 : 1];
}
export function failureProductQuantity(recipe, severity) {
  const override = recipe.failures?.[severity];
  return override?.productQuantity ?? (severity === "mild" && recipe.complexity <= 3 ? recipe.product.quantity : 0);
}
