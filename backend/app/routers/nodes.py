from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Node
from app.schemas.schemas import NodeResponse, NodeCreate, NodeUpdate

router = APIRouter(prefix="/nodes", tags=["Nodes"])

@router.get("/", response_model=list[NodeResponse])
def get_nodes(db: Session = Depends(get_db)):
    return db.query(Node).all()

@router.get("/{node_id}", response_model=NodeResponse)
def get_node(node_id: int, db: Session = Depends(get_db)):
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.post("/", response_model=NodeResponse)
def create_node(node: NodeCreate, db: Session = Depends(get_db)):
    db_node = Node(**node.dict())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@router.put("/{node_id}", response_model=NodeResponse)
def update_node(node_id: int, updated: NodeUpdate, db: Session = Depends(get_db)):
    db_node = db.query(Node).filter(Node.id == node_id).first()
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    for key, value in updated.dict(exclude_unset=True).items():
        setattr(db_node, key, value)
        
    db.commit()
    db.refresh(db_node)
    return db_node

@router.delete("/{node_id}")
def delete_node(node_id: int, db: Session = Depends(get_db)):
    db_node = db.query(Node).filter(Node.id == node_id).first()
    if not db_node:
        raise HTTPException(status_code=404, detail="Node not found")
    db.delete(db_node)
    db.commit()
    return {"detail": "Node deleted successfully"}
