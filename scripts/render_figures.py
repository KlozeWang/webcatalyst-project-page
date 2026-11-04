"""Redraw supplied training data for the project's own visual system."""
from pathlib import Path
import json, os, sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'codex-workspace/video/.deps'))
os.environ['MPLCONFIGDIR']=str(ROOT/'codex-workspace/site-qa/mpl')
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from PIL import Image, ImageDraw, ImageFont

D=json.loads((ROOT/'assets/data/training-dynamics.json').read_text())
COLORS={'noref':'#b75b3c','origin-ref':'#ae7d9a','gpt55-ref':'#6c8cab','gpt55-ref-dom':'#2f6754'}
LABELS={'noref':'GUI Assessor only','origin-ref':'Self Anchor','gpt55-ref':'GPT-5.5 Anchor','gpt55-ref-dom':'GPT-5.5 Anchor + ATC'}
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.titlesize':13,'axes.titleweight':'medium','axes.labelsize':10,'axes.facecolor':'#ffffff','figure.facecolor':'#ffffff','text.color':'#293441','axes.labelcolor':'#677382','xtick.color':'#677382','ytick.color':'#677382','axes.edgecolor':'#dce2e9','svg.fonttype':'none','svg.hashsalt':'webcatalyst-training'})

def series(sheet,metric,key):
    data=D[sheet];i=data['metrics'].index(metric);rows=data['groups']['qwen-35b-a3b-'+key]
    return [r[0] for r in rows],[r[1][i] for r in rows]

def create(name,items,keys,xmax,limits,mobile=False):
    count=len(items)
    fig,axs=plt.subplots(count if mobile else 1,1 if mobile else count,
                         figsize=(5,10.2 if count==3 else 7.1) if mobile else (14.4,4.6))
    if mobile:
        fig.subplots_adjust(left=.14,right=.95,top=.95,bottom=.135 if count==3 else .18,hspace=.62)
    else:
        fig.subplots_adjust(left=.055,right=.975,top=.83,bottom=.25,wspace=.26)
    for ax,(sheet,metric,title),ylim in zip(axs,items,limits):
        ax.set_title(title,loc='left',pad=14,fontsize=12 if mobile else 14)
        ax.spines[['right','top']].set_visible(False)
        ax.grid(axis='y',color='#e6ebf0',linewidth=.8)
        ax.set_axisbelow(True)
        ax.set_xlabel('Training step',labelpad=8,fontsize=10 if mobile else 11)
        ax.set_xlim(-2,xmax+3);ax.set_xticks(range(0,xmax+1,20));ax.set_ylim(*ylim)
        ax.tick_params(length=0,pad=7,labelsize=10 if mobile else 11)
        for key in keys:
            x,y=series(sheet,metric,key)
            ax.plot(x,y,color=COLORS[key],lw=2.3,marker='o',ms=4.5,
                    markeredgecolor='#ffffff',markeredgewidth=.8)
    fig.legend(handles=[Line2D([],[],color=COLORS[k],lw=2.3,marker='o',ms=4.5,label=LABELS[k]) for k in keys],
               loc='lower center',ncol=1 if mobile else len(keys),frameon=False,
               bbox_to_anchor=(.5,.012 if mobile else .025),fontsize=10 if mobile else 12)
    return fig,axs

def save_chart(fig,name):
    path=ROOT/'assets/images'/name
    fig.savefig(path,metadata={'Date':None})
    path.write_text('\n'.join(line.rstrip() for line in path.read_text().splitlines())+'\n')
    plt.close(fig)

for mobile in [False,True]:
    suffix='-mobile' if mobile else ''
    fig,axs=create('loophole',[('WebGen-eval','accuracy','WebGen accuracy (%)'),
        ('Cookie-mg-qwen-eval','functional_score','Mini Games functionality'),
        ('Cookie-mg-qwen-eval','aesthetics_score','Mini Games aesthetics')],
        ['noref','gpt55-ref-dom'],60,[(47,59),(55,65),(68,92)],mobile)
    axs[2].annotate('71.3',xy=(60,71.25),xytext=(-5,-20),textcoords='offset points',ha='right',
                    color=COLORS['noref'],fontweight='bold')
    save_chart(fig,f'analysis-loophole{suffix}.svg')
    items=[('WebGen-eval','accuracy','WebGen accuracy (%)'),
           ('WebGen-eval','Functional Testing','Functional Testing (%)')]
    fig,axs=create('anchor',items,['origin-ref','gpt55-ref'],90,[(44,60),(27,46)],mobile)
    axs[0].annotate('56.4',xy=(20,56.4),xytext=(-9,15),textcoords='offset points',color=COLORS['origin-ref'])
    axs[0].annotate('46.7',xy=(70,46.7),xytext=(8,0),textcoords='offset points',color=COLORS['origin-ref'])
    save_chart(fig,f'analysis-anchor{suffix}.svg')
    fig,axs=create('atc',items,['gpt55-ref','gpt55-ref-dom'],90,[(47.5,59),(32,45)],mobile)
    axs[0].axhline(56.8,color='#9baca4',ls=':',lw=1)
    for step,key in [(30,'gpt55-ref-dom'),(70,'gpt55-ref')]:
        axs[0].vlines(step,48.2,56.8,color=COLORS[key],ls='--',lw=1)
        axs[0].scatter(step,56.8,s=75,facecolor='#ffffff',edgecolor=COLORS[key],lw=2,zorder=6)
        axs[0].text(step,49,f'{step} steps',ha='center',color=COLORS[key],fontsize=10)
    axs[0].text(3,57.45,'Same observed accuracy: 56.8%',fontsize=10)
    save_chart(fig,f'analysis-atc{suffix}.svg')

if '--charts-only' not in sys.argv:
    # A restrained academic preview using the manuscript title and affiliations.
    im=Image.new('RGB',(1200,630),'#ffffff');draw=ImageDraw.Draw(im)
    sans='/System/Library/Fonts/Supplemental/Arial.ttf';bold='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
    draw.text((70,70),'WebCatalyst',font=ImageFont.truetype(bold,73),fill='#242d39')
    for y,line in zip([180,230,280],['Catalyzing Interactive HTML Generation','Capabilities via High-Fidelity','Reinforcement Learning']):
        draw.text((74,y),line,font=ImageFont.truetype(sans,36),fill='#455160')
    draw.line((74,365,1126,365),fill='#dce2e9',width=2)
    draw.text((74,408),'640 training requests  ·  Average rank 14.0 → 4.0',font=ImageFont.truetype(sans,29),fill='#2b5d99')
    draw.text((74,535),'Tsinghua University  ·  Microsoft Research',font=ImageFont.truetype(sans,24),fill='#697585')
    im.save(ROOT/'assets/images/social-card.png',optimize=True)
print('Training-dynamics figures ready (desktop and mobile).')
