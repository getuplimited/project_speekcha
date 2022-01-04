import * as React from 'react';
import { Table, Tag } from 'antd';
import { IEarning } from 'src/interfaces/earning';
import { IUser } from 'src/interfaces';
import { formatDate, Breakpoint } from 'src/lib';
import NumberFormat from '@components/common/layout/numberformat';

interface IProps {
  earnings: IEarning[];
  searching: boolean;
  total: number;
  pageSize: number;
  onChange(pagination, filters, sorter, extra): Function;
}

const breakPoint: Breakpoint[] = ['md'];

const EarningHistoryTable = ({
  earnings,
  searching,
  total,
  pageSize,
  onChange
}: IProps) => {
  const columns = [
    {
      title: 'Transaction',
      dataIndex: 'transactionTokenId',
      key: 'transaction',
      responsive: breakPoint,
      render: (transactionTokenId) => transactionTokenId?.slice(16, 24).toUpperCase() || 'N/A'
    },
    {
      title: 'From',
      dataIndex: 'sourceInfo',
      key: 'from',
      render: (sourceInfo: IUser) => sourceInfo?.username || 'N/A'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="magenta">{type}</Tag>
    },
    {
      title: 'Gross Price',
      dataIndex: 'grossPrice',
      key: 'grossPrice',
      render: (grossPrice: number) => <NumberFormat value={grossPrice} />,
      sorter: true
    },
    {
      title: 'Net Price',
      dataIndex: 'netPrice',
      key: 'netPrice',
      render: (netPrice: number) => <NumberFormat value={netPrice} />,
      sorter: true
    },
    {
      title: 'Earned Money',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => <NumberFormat value={price} />
    },
    {
      title: 'Percent',
      dataIndex: 'commission',
      key: 'commission'
    },
    {
      title: 'Is Paid?',
      key: 'isPaid',
      dataIndex: 'isPaid',
      render: (isPaid: boolean) => <span>{isPaid ? 'YES' : 'NO'}</span>
    },
    {
      title: 'Date',
      key: 'createdAt',
      dataIndex: 'createdAt',
      render: (createdAt: Date) => <span>{formatDate(createdAt)}</span>,
      sorter: true
    }
  ];
  const dataSource = earnings.map((p) => ({ ...p, key: p._id }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      className="table"
      pagination={{
        total,
        pageSize
      }}
      scroll={{ x: true }}
      showSorterTooltip={false}
      loading={searching}
      onChange={onChange}
    />
  );
};

export default EarningHistoryTable;
