<?php
/**
 * Lê um ficheiro YAML para um array PHP (usado para ler app/dados/artigos_loja.yaml).
 *
 * Usa a extensão yaml do PHP quando o servidor a tem; senão usa um leitor
 * simples que cobre o YAML usado nos dados do site: mapas, listas (incluindo
 * "- chave: valor"), strings com ou sem aspas, números, true/false/null,
 * comentários, blocos "|" / ">" e listas curtas "[a, b]".
 * Não suporta âncoras (&, *), tags (!!) nem mapas em linha "{a: b}".
 *
 * Devolve null se o ficheiro não existir ou não puder ser lido.
 */

function ler_yaml($ficheiro)
{
    if (!is_readable($ficheiro)) {
        return null;
    }
    if (function_exists('yaml_parse_file')) {
        $dados = @yaml_parse_file($ficheiro);
        return $dados === false ? null : $dados;
    }
    $texto = file_get_contents($ficheiro);
    if ($texto === false) {
        return null;
    }
    $linhas = preg_split('/\r\n|\r|\n/', $texto);
    $i = 0;
    $i = yaml_proxima_linha($linhas, $i);
    if ($i < count($linhas) && trim($linhas[$i]) === '---') {
        $i = yaml_proxima_linha($linhas, $i + 1);
    }
    if ($i >= count($linhas)) {
        return null;
    }
    return yaml_ler_bloco($linhas, $i, yaml_indentacao($linhas[$i]));
}

// salta linhas vazias e comentários; devolve o índice da próxima linha com conteúdo
function yaml_proxima_linha($linhas, $i)
{
    $n = count($linhas);
    while ($i < $n) {
        $t = trim($linhas[$i]);
        if ($t !== '' && $t[0] !== '#') {
            break;
        }
        $i++;
    }
    return $i;
}

function yaml_indentacao($linha)
{
    return strlen($linha) - strlen(ltrim($linha, ' '));
}

function yaml_e_item_lista($texto)
{
    return $texto === '-' || strncmp($texto, '- ', 2) === 0;
}

// lê um mapa ou uma lista que começa na linha $i com a indentação $indent
function yaml_ler_bloco(&$linhas, &$i, $indent)
{
    $texto = trim($linhas[$i]);
    return yaml_e_item_lista($texto) ? yaml_ler_lista($linhas, $i, $indent) : yaml_ler_mapa($linhas, $i, $indent);
}

function yaml_ler_lista(&$linhas, &$i, $indent)
{
    $lista = [];
    $n = count($linhas);
    while ($i < $n && yaml_indentacao($linhas[$i]) === $indent && yaml_e_item_lista(trim($linhas[$i]))) {
        $resto = ltrim(substr(trim($linhas[$i]), 1), ' ');
        if ($resto === '' || $resto[0] === '#') {
            // "-" sozinho: o valor está nas linhas seguintes, mais indentadas
            $i = yaml_proxima_linha($linhas, $i + 1);
            $lista[] = ($i < $n && yaml_indentacao($linhas[$i]) > $indent)
                ? yaml_ler_bloco($linhas, $i, yaml_indentacao($linhas[$i]))
                : null;
        } elseif (yaml_separador_chave($resto) !== false) {
            // "- chave: valor": o resto da linha é a primeira chave de um mapa
            // cuja indentação é a coluna onde a chave começa
            $coluna = strlen(rtrim($linhas[$i])) - strlen($resto);
            $linhas[$i] = str_repeat(' ', $coluna) . $resto;
            $lista[] = yaml_ler_mapa($linhas, $i, $coluna);
        } else {
            $lista[] = yaml_escalar($resto);
            $i = yaml_proxima_linha($linhas, $i + 1);
        }
    }
    return $lista;
}

function yaml_ler_mapa(&$linhas, &$i, $indent)
{
    $mapa = [];
    $n = count($linhas);
    while ($i < $n && yaml_indentacao($linhas[$i]) === $indent && !yaml_e_item_lista(trim($linhas[$i]))) {
        $texto = trim($linhas[$i]);
        $sep = yaml_separador_chave($texto);
        if ($sep === false) {
            // linha que não é "chave: valor": ignora
            $i = yaml_proxima_linha($linhas, $i + 1);
            continue;
        }
        $chave = yaml_escalar(substr($texto, 0, $sep), true);
        $valor = ltrim(substr($texto, $sep + 1), ' ');

        if (preg_match('/^([|>])[-+]?\s*(#.*)?$/', $valor, $m)) {
            $mapa[$chave] = yaml_ler_bloco_texto($linhas, $i, $indent, $m[1] === '>');
            continue;
        }
        if ($valor === '' || $valor[0] === '#') {
            // valor nas linhas seguintes: mais indentado, ou lista à mesma indentação
            $i = yaml_proxima_linha($linhas, $i + 1);
            if ($i < $n && (yaml_indentacao($linhas[$i]) > $indent
                || (yaml_indentacao($linhas[$i]) === $indent && yaml_e_item_lista(trim($linhas[$i]))))) {
                $mapa[$chave] = yaml_ler_bloco($linhas, $i, yaml_indentacao($linhas[$i]));
            } else {
                $mapa[$chave] = null;
            }
            continue;
        }
        $mapa[$chave] = yaml_escalar($valor);
        $i = yaml_proxima_linha($linhas, $i + 1);
    }
    return $mapa;
}

// texto em bloco ("|" mantém as quebras de linha, ">" junta as linhas com espaços)
function yaml_ler_bloco_texto(&$linhas, &$i, $indent, $dobrar)
{
    $n = count($linhas);
    $partes = [];
    $base = null;
    $i++;
    while ($i < $n) {
        $linha = $linhas[$i];
        if (trim($linha) === '') {
            $partes[] = '';
            $i++;
            continue;
        }
        if (yaml_indentacao($linha) <= $indent) {
            break;
        }
        if ($base === null) {
            $base = yaml_indentacao($linha);
        }
        $partes[] = substr($linha, $base);
        $i++;
    }
    while ($partes && end($partes) === '') {
        array_pop($partes);
    }
    $i = yaml_proxima_linha($linhas, $i);
    return $dobrar ? preg_replace('/(?<!\n)\n(?!\n)/', ' ', implode("\n", $partes)) : implode("\n", $partes);
}

// posição do ":" que separa a chave do valor ("chave: valor" ou "chave:"), ou false
function yaml_separador_chave($texto)
{
    $inicio = 0;
    if ($texto !== '' && ($texto[0] === '"' || $texto[0] === "'")) {
        $fim = yaml_fim_aspas($texto);
        if ($fim === false) {
            return false;
        }
        $inicio = $fim + 1;
    }
    $len = strlen($texto);
    for ($p = $inicio; $p < $len; $p++) {
        if ($texto[$p] === '#' && $p > 0 && $texto[$p - 1] === ' ') {
            return false;
        }
        if ($texto[$p] === ':' && ($p + 1 === $len || $texto[$p + 1] === ' ')) {
            return $p;
        }
        if ($inicio > 0 && $texto[$p] !== ' ') {
            return false;
        }
    }
    return false;
}

// índice da aspa que fecha a string que começa em $texto[0]
function yaml_fim_aspas($texto)
{
    $aspa = $texto[0];
    $len = strlen($texto);
    for ($p = 1; $p < $len; $p++) {
        if ($aspa === "'" && $texto[$p] === "'") {
            if ($p + 1 < $len && $texto[$p + 1] === "'") {
                $p++;
                continue;
            }
            return $p;
        }
        if ($aspa === '"' && $texto[$p] === '\\') {
            $p++;
            continue;
        }
        if ($aspa === '"' && $texto[$p] === '"') {
            return $p;
        }
    }
    return false;
}

// converte um valor escrito numa linha (com ou sem aspas) para string/número/bool/null
function yaml_escalar($texto, $eChave = false)
{
    $texto = trim($texto);
    if ($texto === '') {
        return $eChave ? '' : null;
    }
    if ($texto[0] === "'" || $texto[0] === '"') {
        $fim = yaml_fim_aspas($texto);
        $dentro = substr($texto, 1, ($fim === false ? strlen($texto) : $fim) - 1);
        if ($texto[0] === "'") {
            return str_replace("''", "'", $dentro);
        }
        $json = json_decode('"' . $dentro . '"');
        return $json === null ? stripcslashes($dentro) : $json;
    }
    // comentário no fim da linha
    $texto = rtrim(preg_replace('/\s+#.*$/', '', $texto));
    if ($eChave) {
        return $texto;
    }
    if ($texto[0] === '[' && substr($texto, -1) === ']') {
        $dentro = trim(substr($texto, 1, -1));
        return $dentro === '' ? [] : array_map('yaml_escalar', str_getcsv($dentro, ',', "'", ''));
    }
    $minusculas = strtolower($texto);
    if ($minusculas === 'null' || $texto === '~') {
        return null;
    }
    if ($minusculas === 'true') {
        return true;
    }
    if ($minusculas === 'false') {
        return false;
    }
    if (preg_match('/^-?\d+$/', $texto)) {
        return (int) $texto;
    }
    if (preg_match('/^-?(\d+\.\d*|\.\d+)([eE][-+]?\d+)?$/', $texto)) {
        return (float) $texto;
    }
    return $texto;
}
