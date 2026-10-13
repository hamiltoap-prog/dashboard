// Traduz os erros do Supabase Auth para mensagens que a equipe consiga entender.
export function translateAuthError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : "";

  switch (code) {
    case "over_email_send_rate_limit":
      return "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.";
    case "over_request_rate_limit":
      return "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.";
    case "invalid_credentials":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Esse e-mail ainda não foi confirmado.";
    case "user_already_exists":
      return "Já existe uma conta com esse e-mail. Use “Esqueci minha senha” se não lembra a senha.";
    case "weak_password":
      return "Senha fraca demais. Use pelo menos 6 caracteres.";
    case "same_password":
      return "A nova senha precisa ser diferente da atual.";
  }

  if (/rate limit/i.test(message)) {
    return "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.";
  }
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  return message || "Algo deu errado. Tente novamente.";
}
