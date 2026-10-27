"""Redraw manuscript Figure 5 and Table 3 using their reported values."""
from pathlib import Path
import json, os, sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'codex-workspace/video/.deps'))
os.environ.setdefault('MPLCONFIGDIR',str(ROOT/'codex-workspace/site-qa/mpl'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

D=json.loads((ROOT/'assets/data/experience-analysis.json').read_text())
BEFORE,AFTER='#6d8eb5','#287564'
INK,MUTED,GRID='#354252','#697787','#e8ecf1'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':12,'axes.facecolor':'white','figure.facecolor':'white','text.color':INK,'axes.labelcolor':MUTED,'xtick.color':MUTED,'ytick.color':INK,'axes.edgecolor':'#d9e0e8','svg.fonttype':'none'})
OUT=ROOT/'assets/images'
QA=ROOT/'codex-workspace/site-qa'
QA.mkdir(parents=True,exist_ok=True)

def save(fig,name):
    fig.savefig(OUT/f'{name}.svg')
    fig.savefig(QA/f'{name}.png',dpi=150)
    plt.close(fig)

def dumbbell(rows,name,xmin,xlabel,mobile=False):
    fig,ax=plt.subplots(figsize=(4.4,5.5) if mobile else (7.6,4.8))
    fig.subplots_adjust(left=.42 if mobile else .34,right=.94 if mobile else .95,top=.95 if mobile else .90,bottom=.13 if mobile else .15)
    ax.set_xlim(xmin,105);ax.set_ylim(-.7,6.7);ax.invert_yaxis()
    ax.set_yticks(range(len(rows)),[r['label'] for r in rows],fontsize=10 if mobile else 12)
    ax.set_xticks(range(20 if xmin<20 else 40,101,20))
    ax.set_xlabel('Score / rate (%)' if mobile and xmin>20 else xlabel,labelpad=10,fontsize=10 if mobile else 11)
    ax.spines[['left','top','right']].set_visible(False)
    ax.tick_params(axis='both',length=0,pad=10)
    if mobile:ax.tick_params(axis='x',labelsize=9)
    ax.grid(axis='x',color=GRID,lw=.8);ax.set_axisbelow(True)
    for i,r in enumerate(rows):
        a,b=r['before'],r['after']
        if r['label']=='Success rate (%)':
            ax.axhspan(i-.46,i+.46,color='#f2f7f5',zorder=0)
        ax.plot([a,b],[i,i],color='#c6cfd9',lw=3,solid_capstyle='round',zorder=2)
        ax.scatter(a,i,s=32 if mobile else 48,color=BEFORE,edgecolor='white',linewidth=.8,zorder=3)
        ax.scatter(b,i,s=32 if mobile else 48,color=AFTER,edgecolor='white',linewidth=.8,zorder=3)
        ax.text(a-3 if mobile else a-2,i,f'{a:.1f}',ha='right',va='center',fontsize=9 if mobile else 10,color=BEFORE)
        ax.text(b+3 if mobile else b+2,i,f'{b:.1f}',ha='left',va='center',fontsize=9 if mobile else 10,color=AFTER)
    save(fig,name)

dumbbell(D['reward_components'],'analysis-experience-components',15,'Score')
dumbbell(D['action_transitions'],'analysis-action-transitions',35,'Transition score / success rate (%)')
dumbbell(D['reward_components'],'analysis-experience-components-mobile',15,'Score',mobile=True)
dumbbell(D['action_transitions'],'analysis-action-transitions-mobile',35,'Transition score / success rate (%)',mobile=True)

rows=D['refinement']['rounds'];x=[r['round'] for r in rows]
fig,ax=plt.subplots(figsize=(6.7,4.8))
fig.subplots_adjust(left=.13,right=.94,top=.87,bottom=.17)
ax.set_ylim(67,79);ax.set_xlim(-.18,3.18)
ax.spines[['top','right']].set_visible(False)
ax.set_xticks(x);ax.set_yticks([68,70,72,74,76,78])
ax.set_xlabel('Refinement round',labelpad=10,fontsize=12)
ax.set_ylabel('Mini Games total',labelpad=12,fontsize=12)
ax.tick_params(length=0,pad=8)
ax.grid(axis='y',color=GRID,lw=.8);ax.set_axisbelow(True)
for key,color,offset,va in [('base',BEFORE,-12,'top'),('webcatalyst',AFTER,10,'bottom')]:
    y=[r[key][2] for r in rows]
    ax.plot(x,y,color=color,lw=2.2,marker='o',ms=6,markeredgecolor='white',markeredgewidth=.9)
    for xx,yy in zip(x,y):
        ax.annotate(f'{yy:.1f}',(xx,yy),xytext=(0,offset),textcoords='offset points',ha='center',va=va,fontsize=11,color=color)
fig.savefig(OUT/'analysis-refinement-rounds.svg')
fig.savefig(QA/'analysis-refinement-rounds.png',dpi=150)
fig.set_size_inches(4.5,4.5)
fig.subplots_adjust(left=.16,right=.94,top=.90,bottom=.16)
ax.set_xlabel('Refinement round',labelpad=10,fontsize=10)
ax.set_ylabel('Mini Games total',labelpad=8,fontsize=10)
ax.tick_params(labelsize=10)
save(fig,'analysis-refinement-rounds-mobile')
print('Rendered Figure 5 diagnostics and Table 3 refinement chart from reported data.')
