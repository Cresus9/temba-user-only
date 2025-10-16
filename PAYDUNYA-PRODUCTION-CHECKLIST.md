# 🚀 PAYDUNYA PRODUCTION ACTIVATION CHECKLIST

## Problème Identifié ❌
Votre application Paydunya est encore en **MODE TEST**, c'est pourquoi vous recevez des tokens `test_xxxxx`.

## Solution Complète 🔧

### **Étape 1: Activer le Mode Production dans PayDunya Dashboard**

1. **Connectez-vous à votre compte PayDunya Business**
   - Allez sur: https://app.paydunya.com/

2. **Accédez aux API**
   - Cliquez sur **"Intégrez notre API"** dans le menu à gauche

3. **Configurez votre Application**
   - Sous l'onglet **"Applications"**
   - Cliquez sur **"Détails"** de votre application Temba

4. **Activez le Mode Production**
   - Descendez tout en bas de la page
   - Cliquez sur **"Modifier la configuration"**
   - Pour l'option **"Activer le mode production"**
   - Choisissez **"Oui, l'application est prête"**
   - **Sauvegardez**

### **Étape 2: Vérifier les Clés de Production**

Dans PayDunya Dashboard:
- Assurez-vous que vous voyez vos **clés de PRODUCTION** (pas de test)
- Copiez les nouvelles clés si elles ont changé

### **Étape 3: Mettre à Jour Supabase Environment Variables**

Dans votre Supabase Dashboard:
1. **Project Settings** → **Edge Functions** → **Environment Variables**
2. **Mettez à jour:**
   - `PAYDUNYA_MODE` = `live` (mot "live" sans guillemets)
   - Vérifiez que toutes les autres clés sont les **clés de PRODUCTION**

### **Étape 4: Redéployer les Functions**

```bash
supabase functions deploy create-payment
supabase functions deploy verify-payment
```

### **Étape 5: Tester**

Après activation:
- Les tokens ne devraient plus commencer par `test_`
- Vous devriez recevoir de vraies URLs de paiement PayDunya
- Les paiements redirigeront vers les vraies pages PayDunya

## 🎯 Résultat Attendu

**Avant (MODE TEST):**
```json
{
  "payment_token": "test_9AgQsuEKsb",
  "payment_url": null
}
```

**Après (MODE LIVE):**
```json
{
  "payment_token": "pm_1234567890abcdef",
  "payment_url": "https://app.paydunya.com/sandbox-api/v1/checkout/pm_1234567890abcdef"
}
```

## ⚠️ Important

- **Testez d'abord** avec de petits montants (100-500 XOF)
- **Vérifiez** que les webhooks fonctionnent
- **Surveillez** les logs Supabase après activation

## 📞 Support

Si vous avez des problèmes avec l'activation:
- **Support PayDunya**: Contactez leur support technique
- **Documentation**: https://paydunya.com/developers/v1/



