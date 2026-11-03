import fs from 'node:fs'
import crypto from 'node:crypto'
const root=new URL('../',import.meta.url), out=new URL('specs/009-compromissos-parcelados-emprestimos/',root)
const base=fs.readFileSync(new URL('firestore.rules',root),'utf8')
const keys=Array.from({length:12},(_,i)=>`p${String(i+1).padStart(2,'0')}`)
const all=(fn)=>keys.map((k,i)=>fn(k,i+1)).join('\n        && ')
let source=String.raw`
    // Feature 009: candidate only. Production source is not modified.
    function p9Path(uid,c,id) { return /databases/$(database)/documents/users/$(uid)/$(c)/$(id); }
    function p9EventId(id) { return id is string && id.matches('^(criarSerie|editarParcelas|cancelarParcelas|substituirSerie|pagarParcela|reverterPagamento|vincularReceita)__[A-Za-z0-9-]{1,64}$'); }
    function p9Money(v) { return v is int && v > 0 && v <= 9007199254740991; }
    function p9Keys() { return ['p01','p02','p03','p04','p05','p06','p07','p08','p09','p10','p11','p12']; }
    function p9Index(v) { return int(v[0:4])*12+int(v[5:7])-1; }
    function p9Days(v) { let y=int(v[0:4]); let m=int(v[5:7]); return m==2 ? (y%4==0 && (y%100!=0 || y%400==0) ? 29:28) : (m in [4,6,9,11] ? 30:31); }
    function p9Refs(d) {
      return d is map && d.keys().hasAll(['categoriaId']) && d.keys().hasOnly(['categoriaId','titularId','contaPrevistaId','etiquetaIds'])
        && safeId(d.categoriaId) && (!('titularId' in d) || safeId(d.titularId))
        && (!('contaPrevistaId' in d) || safeId(d.contaPrevistaId)) && (!('etiquetaIds' in d) || labelShape(d.etiquetaIds));
    }
    function p9RefSame(slot,refs) {
      return slot.categoriaId==refs.categoriaId && slot.get('titularId',null)==refs.get('titularId',null)
        && slot.get('contaPrevistaId',null)==refs.get('contaPrevistaId',null) && slot.get('etiquetaIds',[])==refs.get('etiquetaIds',[]);
    }
    function p9References(uid,d) {
      let c=getAfter(p9Path(uid,'categorias',d.categoriaId)).data;
      // Catalog writers enforce the closed metadata schema. Financial references
      // consume the supported schema, active expense role and protected use witness.
      return c.schemaVersion is int && c.schemaVersion==2 && c.estado=='ativo' && c.natureza=='despesa' && c.usoFinanceiro.papel=='classificacao'
        && (!('titularId' in d) || externalHolder(uid,d.titularId))
        && (!('contaPrevistaId' in d) || externalPlannedAccount(uid,d.contaPrevistaId));
    }
    function p9Slot(d,n,count) {
      return d is map && d.keys().hasAll(['numero','quantidadeOriginal','descricao','categoriaId','valorCentavos','competenciaPlanejamento','vencimento','estadoObrigacao','liquidadoLiquidoCentavos','jaLiquidada','ultimoEventoParcelaId'])
        && d.keys().hasOnly(['numero','quantidadeOriginal','descricao','categoriaId','valorCentavos','competenciaPlanejamento','vencimento','estadoObrigacao','liquidadoLiquidoCentavos','jaLiquidada','ultimoEventoParcelaId','titularId','contaPrevistaId','etiquetaIds','observacao','canceledAt','cancelamentoMotivo'])
        && d.numero is int && d.quantidadeOriginal is int && d.numero==n && d.quantidadeOriginal==count && externalText(d.descricao,120) && safeId(d.categoriaId)
        && p9Money(d.valorCentavos) && validMonth(d.competenciaPlanejamento) && calendarDate(d.vencimento)
        && d.liquidadoLiquidoCentavos is int && d.liquidadoLiquidoCentavos>=0 && d.liquidadoLiquidoCentavos<=d.valorCentavos
        && d.jaLiquidada is bool && (d.jaLiquidada || d.liquidadoLiquidoCentavos==0) && p9EventId(d.ultimoEventoParcelaId)
        && (!('titularId' in d) || safeId(d.titularId)) && (!('contaPrevistaId' in d) || safeId(d.contaPrevistaId))
        && (!('etiquetaIds' in d) || labelShape(d.etiquetaIds)) && (!('observacao' in d) || externalText(d.observacao,1000))
        && (d.estadoObrigacao=='ativa' ? !d.keys().hasAny(['canceledAt','cancelamentoMotivo'])
          : d.estadoObrigacao=='cancelada' && d.liquidadoLiquidoCentavos==0 && d.canceledAt is timestamp && externalText(d.cancelamentoMotivo,1000));
    }
    function p9Position(s,k,n) {
      return n<s.numeroInicial || n>s.quantidadeOriginal ? !(k in s.parcelas)
        : k in s.parcelas && p9Slot(s.parcelas[k],n,s.quantidadeOriginal) && (n==s.numeroInicial || s.parcelas[k].vencimento>=s.parcelas[p9Keys()[n-2]].vencimento);
    }
    function p9Amount(s,k) { return k in s.parcelas ? s.parcelas[k].valorCentavos : 0; }
    function p9Sum(s) { return __SUM__; }
    function p9Competencias(s) { return [__COMP__].toSet().difference([''].toSet()); }
    function p9CompOrder(v) {
      return __COMP_ORDER__;
    }
    function p9SeriesHeader(s) {
      return s is map && s.keys().hasOnly(['schemaVersion','version','tipo','origemDados','quantidadeOriginal','numeroInicial','descricao','modo','diaAncora','valorOriginalCentavos','dataContratacao','dataConsumo','parcelas','competencias','ultimoEventoId','createdAt','updatedAt','receitaVinculadaId','substituiSerieId','substituicaoEventoId'])
        && s.schemaVersion is int && s.schemaVersion==1 && safeVersion(s.version) && s.tipo in ['compromissoExterno','emprestimo']
        && s.quantidadeOriginal is int && s.quantidadeOriginal>=1 && s.quantidadeOriginal<=12
        && s.numeroInicial is int && s.numeroInicial>=1 && s.numeroInicial<=s.quantidadeOriginal
        && s.origemDados in ['nova','migrada'] && (s.origemDados!='nova' || s.numeroInicial==1)
        && externalText(s.descricao,120) && s.modo in ['mensal','explicito']
        && (s.modo=='mensal' ? s.diaAncora is int && s.diaAncora>=1 && s.diaAncora<=31 : !('diaAncora' in s))
        && (!('valorOriginalCentavos' in s) || p9Money(s.valorOriginalCentavos))
        && (!('dataContratacao' in s) || calendarDate(s.dataContratacao)) && (!('dataConsumo' in s) || calendarDate(s.dataConsumo))
        && s.parcelas is map && s.parcelas.keys().hasOnly(p9Keys()) && s.parcelas.size()==s.quantidadeOriginal-s.numeroInicial+1
        && s.competencias is list
        && p9EventId(s.ultimoEventoId) && s.createdAt is timestamp && s.updatedAt is timestamp && s.updatedAt>=s.createdAt
        && (!('receitaVinculadaId' in s) || s.tipo=='emprestimo' && safeId(s.receitaVinculadaId))
        && (!('substituiSerieId' in s) || safeId(s.substituiSerieId) && p9EventId(s.substituicaoEventoId))
        && (!('substituicaoEventoId' in s) || 'substituiSerieId' in s);
    }
    function p9Series(s) {
      return p9SeriesHeader(s) && p9CalendarIndex(s) && p9CompOrder(s.competencias) && __POSITIONS__;
    }
    function p9CalendarIndex(s) {
      let comp=p9Competencias(s);
      return s.competencias.size()==comp.size() && s.competencias.toSet()==comp;
    }
    function p9CreationReferences(uid,refs,s,r) {
      let c=getAfter(p9Path(uid,'categorias',refs.categoriaId)).data;
      // Full use metadata is enforced by the catalog/first-use writers. Its
      // protected event and classification role are the authority consumed here.
      return c.schemaVersion is int && c.schemaVersion==2 && c.estado=='ativo' && c.natureza=='despesa' && c.usoFinanceiro.papel=='classificacao'
        && (!('titularId' in refs) || externalHolder(uid,refs.titularId))
        && (!('contaPrevistaId' in refs) || externalPlannedAccount(uid,refs.contaPrevistaId))
        && (r.tipo=='substituirSerie' ? 11:8)+('titularId' in refs ? 1:0)+('contaPrevistaId' in refs ? 1:0)+refs.get('etiquetaIds',[]).size()+(c.usoFinanceiro.eventoId==s.ultimoEventoId ? 3:0)<=18;
    }
    function p9WitnessLink(uid,id,s) {
      let v=getAfter(p9Path(uid,'validacoesParceladas',s.ultimoEventoId+'__'+id)).data;
      return v.schemaVersion==1 && v.serieId==id && v.eventoId==s.ultimoEventoId && v.resultVersion==s.version && v.createdAt==request.time;
    }
    function p9CalendarPosition(s,k,n,firstMonth,previousKey) {
      let d=s.parcelas[k];
      let index=firstMonth+n-s.numeroInicial;
      let month=invoiceMonth(index);
      let days=p9Days(month);
      return (s.modo=='mensal' ? index<=119999 && d.vencimento==month+'-'+invoiceTwo(s.diaAncora>days ? days:s.diaAncora)
          : calendarDate(d.vencimento))
        && (d.competenciaPlanejamento==d.vencimento[0:7] ? true : validMonth(d.competenciaPlanejamento))
        && (n==s.numeroInicial ? true : d.vencimento>=s.parcelas[previousKey].vencimento);
    }
    function p9Witness(uid,id) {
      let v=request.resource.data;
      let s=getAfter(p9Path(uid,'seriesParceladas',v.serieId)).data;
      let r=getAfter(p9Path(uid,'operacoesParceladas',v.eventoId)).data;
      let firstKey=p9Keys()[s.numeroInicial-1];
      let first=s.parcelas[firstKey];
      let firstMonth=p9Index(first.vencimento);
      let cmd=r.tipo=='criarSerie' ? r.comando.criacao:r.comando.nova;
      return v.keys().hasOnly(['schemaVersion','serieId','eventoId','resultVersion','createdAt'])
        && v.schemaVersion is int && v.schemaVersion==1 && safeId(v.serieId) && p9EventId(v.eventoId)
        && v.resultVersion is int && v.resultVersion==1 && v.createdAt==request.time && id==v.eventoId+'__'+v.serieId
        && s.version==1 && s.ultimoEventoId==v.eventoId && s.createdAt==request.time && s.updatedAt==request.time
        && r.createdAt==request.time && r.tipo in ['criarSerie','substituirSerie'] && r.seriesIds.hasAny([v.serieId])
        && r.expectedVersions[v.serieId]==0 && r.resultVersions[v.serieId]==1
        && validMonth(first.vencimento[0:7]) && p9CalendarIndex(s) && p9CompOrder(s.competencias)
        && p9CalendarPosition(s,firstKey,s.numeroInicial,firstMonth,firstKey) && (s.quantidadeOriginal<3 ? true : p9CreationPart2(s,r,cmd));
    }
    function p9InitialCommon(d,s,r,refs) {
      return d is map
        && d.keys().hasOnly(['numero','quantidadeOriginal','descricao','categoriaId','valorCentavos','competenciaPlanejamento','vencimento','estadoObrigacao','liquidadoLiquidoCentavos','jaLiquidada','ultimoEventoParcelaId','titularId','contaPrevistaId','etiquetaIds','observacao'])
        && d.quantidadeOriginal is int && d.quantidadeOriginal==s.quantidadeOriginal
        && externalText(d.descricao,120) && p9Money(d.valorCentavos)
        && (!('observacao' in d) || externalText(d.observacao,1000))
        && d.estadoObrigacao=='ativa' && d.liquidadoLiquidoCentavos is int && d.liquidadoLiquidoCentavos==0 && d.jaLiquidada==false
        && d.ultimoEventoParcelaId==r.tipo+'__'+r.operationKey && p9RefSame(d,refs);
    }
    function p9InitialSlot(s,k,n,expected,first) {
      let d=s.parcelas[k];
      return k in s.parcelas
        && (n==s.numeroInicial ? true : d.diff(first).affectedKeys().hasOnly(['numero','valorCentavos','competenciaPlanejamento','vencimento']))
        && d.numero is int && d.numero==n && d.quantidadeOriginal is int
        && d.liquidadoLiquidoCentavos is int
        && d.valorCentavos is int
        && (expected==null ? p9Money(d.valorCentavos) : d.valorCentavos==expected);
    }
    function p9CreationCalculation(s,cmd) {
      let count=s.quantidadeOriginal-s.numeroInicial+1; let calc=cmd.calculo; let total=calc.totalCentavos;
      return p9Money(total) && (calc.tipo=='explicito' ? p9Sum(s)==total : true)
        && calc.keys().hasAll(['tipo','totalCentavos']) && calc.keys().hasOnly(['tipo','totalCentavos','q','resto','valorCentavos'])
        && calc.tipo in ['total','porParcela','explicito'] && (s.modo=='explicito')==(calc.tipo=='explicito') && (calc.tipo=='total' ? calc.keys().hasOnly(['tipo','totalCentavos','q','resto']) : calc.tipo=='porParcela' ? calc.keys().hasOnly(['tipo','totalCentavos','valorCentavos']) : calc.keys().hasOnly(['tipo','totalCentavos']))
        && (calc.tipo=='total' ? p9Money(calc.q) && calc.resto is int && calc.resto>=0 && calc.resto<count && calc.q*count+calc.resto==total
          : calc.tipo=='porParcela' ? p9Money(calc.valorCentavos) && calc.valorCentavos*count==total : true);
    }
    function p9CreationEnvelope(s,r,cmd,id) {
      return cmd.keys().hasOnly(['dados','referencias','calculo'])
        && !cmd.dados.keys().hasAny(['schemaVersion','version','ultimoEventoId','createdAt','updatedAt','substituiSerieId','substituicaoEventoId','receitaVinculadaId'])
        && s.version==1 && s.createdAt==request.time && s.updatedAt==request.time && !('receitaVinculadaId' in s)
        && (!('substituiSerieId' in s) || r.tipo=='substituirSerie' && s.substituiSerieId==r.comando.serieId && s.substituiSerieId!=id && s.substituicaoEventoId==s.ultimoEventoId)
        && p9CreationCalculation(s,cmd);
    }
    __CREATION_FUNCTIONS__
    function p9Create(s,r,cmd,id) {
      let firstKey=p9Keys()[s.numeroInicial-1];
      let first=s.parcelas[firstKey];
      let c=cmd.calculo;
      let expected=c.tipo=='porParcela' ? c.valorCentavos:c.tipo=='total' ? c.q+(c.resto>0 ? 1:0):null;
      return p9CreationEnvelope(s,r,cmd,id) && s.diff(cmd.dados).affectedKeys().hasOnly(['schemaVersion','version','ultimoEventoId','createdAt','updatedAt','substituiSerieId','substituicaoEventoId'])
        && p9InitialSlot(s,firstKey,s.numeroInicial,expected,first) && p9CreationPart0(s,r,cmd);
    }
    function p9EditRefs(d) {
      return d is map && d.keys().hasOnly(['categoriaId','titularId','contaPrevistaId','etiquetaIds'])
        && (!('categoriaId' in d) || safeId(d.categoriaId)) && (!('titularId' in d) || d.titularId==null || safeId(d.titularId))
        && (!('contaPrevistaId' in d) || d.contaPrevistaId==null || safeId(d.contaPrevistaId)) && (!('etiquetaIds' in d) || labelShape(d.etiquetaIds));
    }
    function p9ChangedReferences(uid,d) {
      return (!('categoriaId' in d) || p9References(uid,{'categoriaId':d.categoriaId}))
        && (d.get('titularId',null)==null || externalHolder(uid,d.titularId))
        && (d.get('contaPrevistaId',null)==null || externalPlannedAccount(uid,d.contaPrevistaId));
    }
    function p9PatchRefs(a,b,refs) {
      return ('categoriaId' in refs ? b.categoriaId==refs.categoriaId : b.categoriaId==a.categoriaId)
        && ('titularId' in refs ? b.get('titularId',null)==refs.titularId : b.get('titularId',null)==a.get('titularId',null))
        && ('contaPrevistaId' in refs ? b.get('contaPrevistaId',null)==refs.contaPrevistaId : b.get('contaPrevistaId',null)==a.get('contaPrevistaId',null))
        && ('etiquetaIds' in refs ? b.get('etiquetaIds',[])==refs.etiquetaIds : b.get('etiquetaIds',[])==a.get('etiquetaIds',[]));
    }
    function p9EditSlot(a,b,r,k,n) {
      let before=a.parcelas.get(k,{}); let after=b.parcelas.get(k,{}); let c=r.comando;
      let eligible=k in a.parcelas && before.estadoObrigacao=='ativa' && !before.jaLiquidada && (c.alcance=='esta' ? n==c.selecionada : n>=c.selecionada);
      return (k in c.parcelas)==eligible && (eligible ? after==c.parcelas[k]
        && after.diff(before).affectedKeys().hasOnly(['descricao','categoriaId','titularId','contaPrevistaId','etiquetaIds','observacao','valorCentavos','vencimento','competenciaPlanejamento','ultimoEventoParcelaId'])
        && after.ultimoEventoParcelaId==b.ultimoEventoId && p9PatchRefs(before,after,c.referencias)
        && (c.get('novoVencimento',null)==null || b.modo!='mensal' || c.alcance=='esta' || p9Index(after.vencimento)==p9Index(c.novoVencimento)+n-c.selecionada
          && int(after.vencimento[8:10])==(int(c.novoVencimento[8:10])>p9Days(after.vencimento) ? p9Days(after.vencimento):int(c.novoVencimento[8:10])))
        : after==before);
    }
    function p9CancelSlot(a,b,r,k) {
      let before=a.parcelas.get(k,{}); let after=b.parcelas.get(k,{});
      return k in r.comando.alvos ? k in a.parcelas && before.estadoObrigacao=='ativa' && before.liquidadoLiquidoCentavos==0
        && after.diff(before).affectedKeys().hasOnly(['estadoObrigacao','canceledAt','cancelamentoMotivo','ultimoEventoParcelaId'])
        && after.estadoObrigacao=='cancelada' && after.canceledAt==request.time && after.cancelamentoMotivo==r.comando.motivo && after.ultimoEventoParcelaId==b.ultimoEventoId
        : before==after;
    }
    function p9UnchangedOther(a,b,key) { return a.parcelas.diff(b.parcelas).affectedKeys().hasOnly([key]); }
    function p9Pay(uid,a,b,r) {
      let c=r.comando; let k=c.parcela; let before=a.parcelas[k]; let after=b.parcelas[k]; let f=r.fato;
      let account=getAfter(p9Path(uid,'contas',f.contaId)).data;
      return c.keys().hasAll(['serieId','parcela']) && c.keys().hasOnly(['serieId','parcela']) && p9UnchangedOther(a,b,k)
        && before.estadoObrigacao=='ativa' && f.keys().hasAll(['tipo','valorCentavos','contaId','dataEfetiva']) && f.keys().hasOnly(['tipo','valorCentavos','contaId','dataEfetiva'])
        && f.tipo=='pagamento' && p9Money(f.valorCentavos) && safeId(f.contaId) && calendarDate(f.dataEfetiva) && notFuture(f.dataEfetiva)
        && activeSimpleReference(account) && validUse('contas',account.usoFinanceiro)
        && after.diff(before).affectedKeys().hasOnly(['liquidadoLiquidoCentavos','jaLiquidada','ultimoEventoParcelaId'])
        && after.liquidadoLiquidoCentavos==before.liquidadoLiquidoCentavos+f.valorCentavos && after.liquidadoLiquidoCentavos<=before.valorCentavos
        && after.jaLiquidada==true && after.ultimoEventoParcelaId==b.ultimoEventoId && r.contextoParcela==before;
    }
    function p9Reverse(uid,a,b,r) {
      let c=r.comando; let before=a.parcelas[c.parcela]; let after=b.parcelas[c.parcela];
      let original=get(p9Path(uid,'operacoesParceladas',c.originalEventoId)).data;
      let marker=getAfter(p9Path(uid,'reversoesParceladas',c.originalEventoId)).data;
      return c.keys().hasAll(['serieId','parcela','originalEventoId','motivo']) && c.keys().hasOnly(['serieId','parcela','originalEventoId','motivo'])
        && externalText(c.motivo,1000) && p9UnchangedOther(a,b,c.parcela) && before.estadoObrigacao=='ativa'
        && original.tipo=='pagarParcela' && original.comando.serieId==c.serieId && original.comando.parcela==c.parcela
        && r.fato=={'tipo':'reversaoPagamento','valorCentavos':original.fato.valorCentavos,'contaId':original.fato.contaId,'dataEfetiva':original.fato.dataEfetiva,'originalId':c.originalEventoId,'motivo':c.motivo}
        && after.diff(before).affectedKeys().hasOnly(['liquidadoLiquidoCentavos','ultimoEventoParcelaId']) && after.ultimoEventoParcelaId==b.ultimoEventoId
        && after.liquidadoLiquidoCentavos==before.liquidadoLiquidoCentavos-original.fato.valorCentavos && after.liquidadoLiquidoCentavos>=0
        && marker.reversaoEventoId==b.ultimoEventoId && marker.serieId==c.serieId && marker.parcela==c.parcela && r.contextoParcela==before;
    }
    function p9Update(uid,a,b,r) {
      let c=r.comando;
      return b.diff(a).affectedKeys().hasOnly(['version','updatedAt','ultimoEventoId','parcelas','competencias','receitaVinculadaId'])
        && b.version==a.version+1 && b.updatedAt==request.time && a.parcelas.keys().toSet()==b.parcelas.keys().toSet()
        && (r.tipo=='editarParcelas' ? c.keys().hasAll(['serieId','selecionada','alcance','parcelas','referencias']) && c.keys().hasOnly(['serieId','selecionada','alcance','parcelas','referencias','novoVencimento'])
          && c.selecionada is int && c.selecionada>=a.numeroInicial && c.selecionada<=a.quantidadeOriginal && c.alcance in ['esta','estaEFuturasNaoPagas']
          && (!('novoVencimento' in c) || calendarDate(c.novoVencimento)) && c.parcelas.size()>0 && c.parcelas.keys().hasOnly(p9Keys()) && p9EditRefs(c.referencias) && a.parcelas!=b.parcelas
          && a.get('receitaVinculadaId',null)==b.get('receitaVinculadaId',null) && p9ChangedReferences(uid,c.referencias) && __EDIT__
        : r.tipo in ['cancelarParcelas','substituirSerie'] ? c.alvos is list && c.alvos.size()>0 && c.alvos.toSet().size()==c.alvos.size() && c.alvos.hasOnly(a.parcelas.keys())
          && externalText(c.motivo,1000) && a.get('receitaVinculadaId',null)==b.get('receitaVinculadaId',null) && __CANCEL__
        : r.tipo=='pagarParcela' ? a.get('receitaVinculadaId',null)==b.get('receitaVinculadaId',null) && p9Pay(uid,a,b,r)
        : r.tipo=='reverterPagamento' ? a.get('receitaVinculadaId',null)==b.get('receitaVinculadaId',null) && p9Reverse(uid,a,b,r)
        : r.tipo=='vincularReceita' && a.tipo=='emprestimo' && !('receitaVinculadaId' in a) && b.receitaVinculadaId==c.receitaId && a.parcelas==b.parcelas);
    }
    function p9SeriesWrite(uid,id,creating) {
      let s=request.resource.data; let r=getAfter(p9Path(uid,'operacoesParceladas',s.ultimoEventoId)).data;
      let replacing=creating && r.tipo=='substituirSerie'; let cmd=replacing ? r.comando.nova : r.comando.get('criacao',{});
      return (creating ? r.tipo in ['criarSerie','substituirSerie'] : r.tipo in ['editarParcelas','cancelarParcelas','substituirSerie','pagarParcela','reverterPagamento','vincularReceita']) ? safeId(id) && (creating ? true : p9Series(s)) && r.seriesIds.hasAny([id]) && r.resultVersions[id]==s.version && r.createdAt==request.time
        && (creating ? r.expectedVersions[id]==0 && (r.tipo=='criarSerie' && r.comando.serieId==id || replacing && r.comando.novaSerieId==id)
          && (!('substituiSerieId' in s) ? !replacing : replacing) && p9Create(s,r,cmd,id) && p9CreationReferences(uid,cmd.referencias,s,r) && p9WitnessLink(uid,id,s)
          : r.expectedVersions[id]==resource.data.version && r.comando.serieId==id && p9Update(uid,resource.data,s,r)) : false;
    }
    function p9ReceiptShape(r,id) {
      return r.keys().hasOnly(['schemaVersion','contractVersion','tipo','operationKey','seriesIds','expectedVersions','resultVersions','comando','createdAt','fato','contextoParcela'])
        && r.schemaVersion is int && r.contractVersion is int && r.schemaVersion==1 && r.contractVersion==1 && safeId(r.operationKey) && p9EventId(id) && id==r.tipo+'__'+r.operationKey && r.createdAt==request.time
        && r.seriesIds is list && r.expectedVersions is map && r.resultVersions is map && r.comando is map
        && r.seriesIds.size()>=1 && r.seriesIds.size()<=2 && r.seriesIds.toSet().size()==r.seriesIds.size() && r.expectedVersions.keys().toSet()==r.seriesIds.toSet() && r.resultVersions.keys().toSet()==r.seriesIds.toSet()
        && (r.tipo in ['pagarParcela','reverterPagamento'] ? r.keys().hasAll(['fato','contextoParcela']) : !r.keys().hasAny(['fato','contextoParcela']));
    }
    function p9Receipt(uid,id) {
      let r=request.resource.data; let c=r.comando; let s=getAfter(p9Path(uid,'seriesParceladas',c.serieId)).data;
      return p9ReceiptShape(r,id) && catalogReady(uid) && safeId(c.serieId) && s.ultimoEventoId==id && s.version==r.resultVersions[c.serieId]
        && r.expectedVersions[c.serieId] is int && r.expectedVersions[c.serieId]>=0 && r.resultVersions[c.serieId] is int && r.resultVersions[c.serieId]==r.expectedVersions[c.serieId]+1
        && (r.tipo=='substituirSerie' ? safeId(c.novaSerieId) && c.novaSerieId!=c.serieId && r.seriesIds==[c.serieId,c.novaSerieId]
          && p9Replacement(uid,id,r) && externalLabels(uid,c.nova.referencias)
        : r.seriesIds==[c.serieId] && (r.tipo=='criarSerie' ? c.keys().hasOnly(['serieId','criacao']) && r.expectedVersions[c.serieId]==0 && p9SeriesHeader(s) && p9CreationPart1(s,r,c.criacao) && p9Refs(c.criacao.referencias) && externalLabels(uid,c.criacao.referencias)
        : r.tipo=='editarParcelas' ? externalLabels(uid,c.referencias)
        : r.tipo=='cancelarParcelas' ? c.keys().hasOnly(['serieId','alvos','motivo'])
        : r.tipo=='pagarParcela' ? r.fato.tipo=='pagamento'
        : r.tipo=='reverterPagamento' ? p9Original(uid,r)
        : r.tipo=='vincularReceita' && p9Revenue(uid,id,r)));
    }
    function p9Replacement(uid,id,r) {
      let s=getAfter(p9Path(uid,'seriesParceladas',r.comando.novaSerieId)).data;
      return r.comando.keys().hasOnly(['serieId','novaSerieId','alvos','motivo','nova']) && r.expectedVersions[r.comando.novaSerieId] is int && r.expectedVersions[r.comando.novaSerieId]==0
        && r.resultVersions[r.comando.novaSerieId] is int && r.resultVersions[r.comando.novaSerieId]==1 && s.version==1 && s.ultimoEventoId==id && s.substituiSerieId==r.comando.serieId && s.substituicaoEventoId==id && p9SeriesHeader(s) && p9CreationPart1(s,r,r.comando.nova) && p9Refs(r.comando.nova.referencias);
    }
    function p9Original(uid,r) {
      let o=get(p9Path(uid,'operacoesParceladas',r.comando.originalEventoId)).data;
      return o.tipo=='pagarParcela' && o.comando.serieId==r.comando.serieId && o.comando.parcela==r.comando.parcela && p9Money(o.fato.valorCentavos);
    }
    function p9Revenue(uid,id,r) {
      let c=r.comando; let v=getAfter(p9Path(uid,'vinculosReceitasEmprestimos',c.receitaId)).data;
      let income=get(p9Path(uid,'lancamentosExternos',c.receitaId)).data;
      return c.keys().hasOnly(['serieId','receitaId']) && safeId(c.receitaId) && income.natureza=='receita' && income.schemaVersion==1
        && v.serieId==c.serieId && v.receitaId==c.receitaId && v.operacaoId==id;
    }
    function p9Marker(uid,id) {
      let m=request.resource.data; let r=getAfter(p9Path(uid,'operacoesParceladas',m.reversaoEventoId)).data;
      return m.keys().hasAll(['serieId','parcela','originalEventoId','reversaoEventoId','createdAt']) && m.keys().hasOnly(['serieId','parcela','originalEventoId','reversaoEventoId','createdAt'])
        && m.createdAt==request.time && m.originalEventoId==id && p9EventId(id) && r.tipo=='reverterPagamento'
        && r.comando.serieId==m.serieId && r.comando.parcela==m.parcela && r.comando.originalEventoId==id;
    }
    function p9Link(uid,id) {
      let m=request.resource.data; let r=getAfter(p9Path(uid,'operacoesParceladas',m.operacaoId)).data;
      return m.keys().hasAll(['serieId','receitaId','operacaoId','createdAt']) && m.keys().hasOnly(['serieId','receitaId','operacaoId','createdAt'])
        && m.createdAt==request.time && m.receitaId==id && safeId(id) && r.tipo=='vincularReceita' && r.comando.serieId==m.serieId && r.comando.receitaId==id;
    }
    function p9Use(uid,c,id) {
      let d=request.resource.data; let u=d.usoFinanceiro; let r=getAfter(p9Path(uid,'operacoesParceladas',u.eventoId)); let old=get(p9Path(uid,'operacoesParceladas',u.eventoId));
      return c in ['categorias','contas'] && resource.data.schemaVersion is int && resource.data.schemaVersion in [1,2] && validCatalogDoc(c,d) && resource.data.estado=='ativo' && !('usoFinanceiro' in resource.data)
        && d.diff(resource.data).affectedKeys().hasOnly(['schemaVersion','usoFinanceiro']) && d.schemaVersion==2 && old==null && r!=null
        && u.keys().hasAll(['eventoId','origemId','papel','createdAt']) && u.keys().hasOnly(['eventoId','origemId','papel','createdAt'])
        && u.createdAt==request.time && r.data.createdAt==request.time && u.origemId==(r.data.tipo=='substituirSerie' ? r.data.comando.novaSerieId:r.data.comando.serieId)
        && (c=='contas' ? u.papel=='movimentacao' && r.data.tipo=='pagarParcela' && r.data.fato.contaId==id
          : u.papel=='classificacao' && (r.data.tipo=='criarSerie' && r.data.comando.criacao.referencias.categoriaId==id
            || r.data.tipo=='editarParcelas' && r.data.comando.referencias.categoriaId==id
            || r.data.tipo=='substituirSerie' && r.data.comando.nova.referencias.categoriaId==id));
    }
    match /users/{uid}/seriesParceladas/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && p9SeriesWrite(uid,id,true);
      allow update: if own(uid) && p9SeriesWrite(uid,id,false);
      allow delete: if false;
    }
    match /users/{uid}/validacoesParceladas/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow create: if own(uid) && p9Witness(uid,id);
      allow list,update,delete: if false;
    }
    match /users/{uid}/operacoesParceladas/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow list: if own(uid) && catalogReady(uid) && request.query.limit>=1 && request.query.limit<=50;
      allow create: if own(uid) && p9Receipt(uid,id);
      allow update, delete: if false;
    }
    match /users/{uid}/reversoesParceladas/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow create: if own(uid) && p9Marker(uid,id);
      allow list,update,delete: if false;
    }
    match /users/{uid}/vinculosReceitasEmprestimos/{id} {
      allow get: if own(uid) && catalogReady(uid);
      allow create: if own(uid) && p9Link(uid,id);
      allow list,update,delete: if false;
    }
`
source=source.replace('__SUM__',keys.map(k=>`p9Amount(s,'${k}')`).join('+'))
source=source.replace('__COMP__',keys.map(k=>`s.parcelas.get('${k}',{'competenciaPlanejamento':''}).competenciaPlanejamento`).join(','))
source=source.replace('__COMP_ORDER__',Array.from({length:11},(_,i)=>`(v.size()<${i+2} ? true : v[${i}]<v[${i+1}]${i<10?' && ':''}`).join('')+')'.repeat(11))
source=source.replace('__POSITIONS__',all((k,n)=>`p9Position(s,'${k}',${n})`))
source=source.replace('__CREATION_FUNCTIONS__',Array.from({length:3},(_,part)=>`function p9CreationPart${part}(s,r,cmd) {
      let first=s.parcelas[p9Keys()[s.numeroInicial-1]];
      let firstMonth=p9Index(first.vencimento);
      let calc=cmd.calculo;
      let unit=calc.tipo=='porParcela' ? calc.valorCentavos : calc.tipo=='total' ? calc.q:null;
      let remainder=calc.tipo=='total' ? calc.resto:0;
      return ${part===1?'p9InitialCommon(first,s,r,cmd.referencias) && ':''}(s.numeroInicial==s.quantidadeOriginal ? true : ${keys.map((k,i)=>({k,n:i+1})).filter(({n})=>(n-1)%3===part).map(({k,n})=>`(${n}<=s.numeroInicial || ${n}>s.quantidadeOriginal ? true : p9InitialSlot(s,'${k}',${n},unit==null ? null:unit+(${n}-s.numeroInicial<remainder ? 1:0),first) && p9CalendarPosition(s,'${k}',${n},firstMonth,'${keys[Math.max(0,n-2)]}'))`).join('\n        && ')});
    }`).join('\n    '))
source=source.replace('__EDIT__',all((k,n)=>`p9EditSlot(a,b,r,'${k}',${n})`))
source=source.replace('__CANCEL__',all(k=>`p9CancelSlot(a,b,r,'${k}')`))
// Preserve old consumer branches; recognize the new immutable use witness only in its own branch.
let candidate=base.replace("^(criarReceita|criarDespesa|gastoImediato|editarOrigem)__", "^(criarReceita|criarDespesa|gastoImediato|editarOrigem|criarSerie|editarParcelas|substituirSerie)__")
candidate=candidate.replace("^(pagar|receber|gastoImediato)__", "^(pagar|receber|gastoImediato|pagarParcela)__")
for(const c of ['categorias','contas'])candidate=candidate.replace(`usePatch() ? financialUsePatch(uid,'${c}',id)`, `usePatch() ? (p9EventId(request.resource.data.usoFinanceiro.eventoId) ? p9Use(uid,'${c}',id) : financialUsePatch(uid,'${c}',id))`)
candidate=candidate.replace('\n    match /',()=>source+'\n    match /')
fs.writeFileSync(new URL('firestore-parcelados.candidate.rules',out),candidate)
fs.writeFileSync(new URL('candidate-manifest.json',out),JSON.stringify({baseSha256:crypto.createHash('sha256').update(base).digest('hex'),candidateSha256:crypto.createHash('sha256').update(candidate).digest('hex'),bytes:Buffer.byteLength(candidate),mode:'candidate-only-no-deploy',protocol:'S-R-V-candidate-not-enabled',collections:['seriesParceladas','operacoesParceladas','validacoesParceladas','reversoesParceladas','vinculosReceitasEmprestimos']},null,2)+'\n')
console.log(JSON.stringify({candidateBytes:Buffer.byteLength(candidate),network:false,productionChanged:false}))





